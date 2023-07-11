# Using Explain Plans

When using the MongoDB Query Language (MQL) to develop queries, it is important to view the [explain plan](https://docs.mongodb.com/manual/reference/method/db.collection.explain/) for a query to determine if you've used the appropriate index and if you need to optimise other aspects of the query or the data model. An explain plan allows you to fully understand the performance implications of the query you have created.

The same applies to aggregation pipelines and the ability to view an _explain plan_ for the executed pipeline. However, with aggregations, an explain plan tends to be even more critical because considerably more complex logic can be assembled and run in the database. There are far more opportunities for performance bottlenecks to occur, requiring optimisation.

The MongoDB database engine will do its best to apply its own [aggregation pipeline optimisations](https://docs.mongodb.com/manual/core/aggregation-pipeline-optimization/) at runtime. Nevertheless, there could be some optimisations that only you can make. A database engine should never optimise a pipeline in such a way as to risk changing the functional behaviour and outcome of the pipeline. The database engine doesn't always have the extra context that your brain has, relating to the actual business problem at hand. It may not be able to make some types of judgement calls about what pipeline changes to apply to make it run faster. The availability of an explain plan for aggregations enables you to bridge this gap. It allows you to understand the database engine's applied optimisations and detect further potential optimisations you can manually implement in the pipeline.


## Viewing An Explain Plan

To view the explain plan for an aggregation pipeline, you can execute commands such as the following:

```javascript
db.coll.explain().aggregate([{"$match": {"name": "Jo"}}]);
```

In this book, you will already have seen the convention used to firstly define a separate variable for the pipeline, followed by the call to the `aggregate()` function, passing in the pipeline argument, as shown here:

```javascript
db.coll.aggregate(pipeline);
```

By adopting this approach, it's easier for you to use the same pipeline definition interchangeably with different commands. Whilst prototyping and debugging a pipeline, it is handy for you to be able to quickly switch from executing the pipeline to instead generating the explain plan for the same defined pipeline, as follows:

```javascript
db.coll.explain().aggregate(pipeline);
```

As with MQL, there are three different verbosity modes that you can generate an explain plan with, as shown below:

```javascript
// QueryPlanner verbosity  (default if no verbosity parameter provided)
db.coll.explain("queryPlanner").aggregate(pipeline);
```

```javascript
// ExecutionStats verbosity
db.coll.explain("executionStats").aggregate(pipeline);
```

```javascript
// AllPlansExecution verbosity 
db.coll.explain("allPlansExecution").aggregate(pipeline);
```

In most cases, you will find that running the `executionStats` variant is the most informative mode. Rather than showing just the query planner's thought process, it also provides actual statistics on the "winning" execution plan (e.g. the total keys examined, the total docs examined, etc.). However, this isn't the default because it actually executes the aggregation in addition to formulating the query plan. If the source collection is large or the pipeline is suboptimal, it will take a while to return the explain plan result.

Note, the [aggregate()](https://docs.mongodb.com/manual/reference/method/db.collection.aggregate/) function also provides a vestigial `explain` option to ask for an explain plan to be generated and returned. Nonetheless, this is more limited and cumbersome to use, so you should avoid it.


## Understanding The Explain Plan

To provide an example, let us assume a shop's data set includes information on each customer and what retail orders the customer has made over the years. The _customer orders_ collection contains documents similar to the following example:

```javascript
{
  "customer_id": "elise_smith@myemail.com",
  "orders": [
    {
      "orderdate": ISODate("2020-01-13T09:32:07Z"),
      "product_type": "GARDEN",
      "value": NumberDecimal("99.99")
    },
    {
      "orderdate": ISODate("2020-05-30T08:35:52Z"),
      "product_type": "ELECTRONICS",
      "value": NumberDecimal("231.43")
    }
  ]
}
```

You've defined an index on the `customer_id` field. You create the following aggregation pipeline to show the three most expensive orders made by a customer whose ID is `tonijones@myemail.com`, as shown below:

```javascript
var pipeline = [
  // Unpack each order from customer orders array as a new separate record
  {"$unwind": {
    "path": "$orders",
  }},
  
  // Match on only one customer
  {"$match": {
    "customer_id": "tonijones@myemail.com",
  }},

  // Sort customer's purchases by most expensive first
  {"$sort" : {
    "orders.value" : -1,
  }},
  
  // Show only the top 3 most expensive purchases
  {"$limit" : 3},

  // Use the order's value as a top level field
  {"$set": {
    "order_value": "$orders.value",
  }},
    
  // Drop the document's id and orders sub-document from the results
  {"$unset" : [
    "_id",
    "orders",
  ]},
];
```

Upon executing this aggregation against an extensive sample data set, you receive the following result:

```javascript
[
  {
    customer_id: 'tonijones@myemail.com',
    order_value: NumberDecimal("1024.89")
  },
  {
    customer_id: 'tonijones@myemail.com',
    order_value: NumberDecimal("187.99")
  },
  {
    customer_id: 'tonijones@myemail.com',
    order_value: NumberDecimal("4.59")
  }
]
```

You then request the _query planner_ part of the explain plan:

```javascript
db.customer_orders.explain("queryPlanner").aggregate(pipeline);
```

The query plan output for this pipeline shows the following (excluding some information for brevity):

```javascript
stages: [
  {
    '$cursor': {
      queryPlanner: {
        parsedQuery: { customer_id: { '$eq': 'tonijones@myemail.com' } },
        winningPlan: {
          stage: 'FETCH',
          inputStage: {
            stage: 'IXSCAN',
            keyPattern: { customer_id: 1 },
            indexName: 'customer_id_1',
            direction: 'forward',
            indexBounds: {
              customer_id: [
                '["tonijones@myemail.com", "tonijones@myemail.com"]'
              ]
            }
          }
        },
      }
    }
  },
  
  { '$unwind': { path: '$orders' } },
  
  { '$sort': { sortKey: { 'orders.value': -1 }, limit: 3 } },
  
  { '$set': { order_value: '$orders.value' } },
  
  { '$project': { _id: false, orders: false } }
]
```

You can deduce some illuminating insights from this query plan:

 * To optimise the aggregation, the database engine has reordered the pipeline positioning the filter belonging to the `$match` to the top of the pipeline. The database engine moves the content of `$match` ahead of the `$unwind` stage without changing the aggregation's functional behaviour or outcome.
 
 * The first stage of the database optimised version of the pipeline is an _internal_ `$cursor` stage, regardless of the order you placed the pipeline stages in. The `$cursor` _runtime_ stage is always the first action executed for any aggregation. Under the covers, the aggregation engine reuses the MQL query engine to perform a "regular" query against the collection, with a filter based on the aggregation's `$match` contents. The aggregation runtime uses the resulting query cursor to pull batches of records. This is similar to how a client application with a MongoDB driver uses a query cursor when remotely invoking an MQL query to pull batches. As with a normal MQL query, the regular database query engine will try to use an index if it makes sense. In this case an index is indeed leveraged, as is visible in the embedded `$queryPlanner` metadata, showing the `"stage" : "IXSCAN"` element and the index used, `"indexName" : "customer_id_1"`.

 * To further optimise the aggregation, the database engine has collapsed the `$sort` and `$limit` into a single _special internal sort stage_ which can perform both actions in one go. In this situation, during the sorting process, the aggregation engine only has to track the current three most expensive orders in memory. It does not have to hold the whole data set in memory when sorting, which may otherwise be resource prohibitive in many scenarios, requiring more RAM than is available.
 
You might also want to see the _execution stats_ part of the explain plan. The specific new information shown in `executionStats`, versus the default of `queryPlanner`, is identical to the [normal MQL explain plan](https://docs.mongodb.com/manual/tutorial/analyze-query-plan/) returned for a regular `find()` operation. Consequently, for aggregations, similar principles to MQL apply for spotting things like "have I used the optimal index?" and "does my data model lend itself to efficiently processing this query?".
 
You ask for the _execution stats_ part of the explain plan:

```javascript
db.customer_orders.explain("executionStats").aggregate(pipeline);
```

Below is a redacted example of the output you will see, highlighting some of the most relevant metadata elements you should generally focus on.

```javascript
executionStats: {
  nReturned: 1,
  totalKeysExamined: 1,
  totalDocsExamined: 1,
  executionStages: {
    stage: 'FETCH',
    nReturned: 1,
    works: 2,
    advanced: 1,
    docsExamined: 1,
    inputStage: {
      stage: 'IXSCAN',
      nReturned: 1,
      works: 2,
      advanced: 1,
      keyPattern: { customer_id: 1 },
      indexName: 'customer_id_1',
      direction: 'forward',
      indexBounds: {
        customer_id: [
          '["tonijones@myemail.com", "tonijones@myemail.com"]'
        ]
      },
      keysExamined: 1,
    }
  }
}
```

Here, this part of the plan also shows that the aggregation uses the existing index. Because `totalKeysExamined` and `totalDocsExamined` match, the aggregation fully leverages this index to identify the required records, which is good news. Nevertheless, the targeted index doesn't necessarily mean the aggregation's query part is fully optimised. For example, if there is the need to reduce latency further, you can do some analysis to determine if the index can completely [cover the query](https://docs.mongodb.com/manual/core/query-optimization/#covered-query). Suppose the _cursor query_ part of the aggregation is satisfied entirely using the index and does not have to examine any raw documents. In that case, you will see `totalDocsExamined: 0` in the explain plan.

