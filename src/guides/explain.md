# Using Explain Plans

When using the MongoDB Query Language (MQL) to develop queries, it is important to view the [explain plan](https://docs.mongodb.com/manual/reference/method/db.collection.explain/) for the query to determine if you've used the appropriate index and if you need to optimise other aspects of the query or the data model. An explain plan allows you to understand fully the performance implications of the query you have created.

The same applies to aggregation pipelines and the ability to view an _explain plan_ for the executed pipeline. However, with aggregations, an explain plan tends to be even more critical because considerably more complex logic can be assembled and run in the database. There are far more opportunities for performance bottlenecks to occur, requiring optimisation. The MongoDB database engine will do its best to apply its own [aggregation pipeline optimisations](https://docs.mongodb.com/manual/core/aggregation-pipeline-optimization/) at runtime. Nevertheless, there could be some optimisations that only you can make. A database engine should never optimise a pipeline in such a way as to risk changing the functional behaviour and outcome of the pipeline. The database engine doesn't always have the extra context that your brain has, relating to the actual business problem at hand. It may not be able to make some types of judgment calls about what pipeline changes to apply to make it run faster. The availability of an explain plan for aggregations enables you to bridge this gap. It allows you to understand the database engine's applied optimisations and detect further potential optimisations you can manually implement in the pipeline.


## Viewing An Explain Plan

To view the explain plan for an aggregation pipeline, you can execute commands such as the following:

```javascript
db.coll.explain().aggregate([{"$match": {"name": "Jo"}}]);
```

In this book, you will already have seen the convention used to firstly define a separate variable for the pipeline, followed by the call to the `aggregate()` function, passing in the pipeline argument, as shown here:

```javascript
db.coll.aggregate(pipeline);
```

By adopting this approach, it easier for you to use the same pipeline definition interchangeably with different commands. Whilst prototyping and debugging a pipeline, it is handy for you to be able to quickly switch from executing the pipeline to instead generating the explain plan for the same defined pipeline, as follows:

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

In most cases, you will find that running the `executionStats` variant is the most informative mode. Rather than showing just the query planner's thought process, it also provides actual statistics on the 'winning' execution plan (e.g. the total keys examined, the total docs examined, etc.). However, this isn't the default because it actually executes the aggregation in addition to formulating the query plan. If the source collection is large or the pipeline is sub-optimal, it will take a while to return the explain plan result.

Note, the [aggregate()](https://docs.mongodb.com/manual/reference/method/db.collection.aggregate/) function also has the option of providing a vestigial `explain` parameter to enable an explain plan to be generated and returned. Nonetheless, this is more limited and cumbersome to use, so you should avoid it.


## Understanding The Explain Plan

To provide an example, let us assume a data set includes information on a group of people. You have persisted a collection called _persons_ with an index defined on its _date of birth_ field. You've created the following aggregation pipeline to show the three youngest people in the collection, for people born on or after 1970, as shown below:

```javascript
var pipeline = [
  // Omit address sub-document (not needed)
  {"$unset" : [
    "address",
  ]},

  // Match people born in 1970 or later only
  {"$match" : {
    "dateofbirth" : {"$gte" : ISODate("1970-01-01T00:00:00Z")},
  }},
    
  // Sort by youngest person first
  {"$sort" : {
    "dateofbirth" : -1,
  }},

  // Only show 3 youngest people  
  {"$limit" : 3},
];
```

You might then request the _query planner_ part of the explain plan:

```javascript
db.persons.explain("queryPlanner").aggregate(pipeline);
```

The query plan output for this pipeline shows the following (excluding some information for brevity):

```javascript
stages: [
  {'$cursor': {
    queryPlanner: {
      parsedQuery: { dateofbirth: { '$gte': 1970-01-01T00:00:00.000Z } },
      winningPlan: {
        stage: 'FETCH',
        inputStage: {
          stage: 'IXSCAN',
          keyPattern: { dateofbirth: -1 },
          indexName: 'dateofbirth_-1',
          isMultiKey: false,
          multiKeyPaths: { dateofbirth: [] },
          isUnique: false,
          isSparse: false,
          isPartial: false,
          indexVersion: 2,
          direction: 'forward',
          indexBounds: {
            dateofbirth: [ '[new Date(9223372036854775807), new Date(0)]' ]
          }
        }
      }
    }
  }},
  
  { '$project': { address: false } },
  
  { '$sort': { sortKey: { dateofbirth: -1 }, limit: 3 } }
]
```

You can deduce some illuminating insights from this query plan:

 * To optimise the aggregation, the database engine has reordered the pipeline and moved the filter belonging to the `$match` to the top of the pipeline without changing its functional behaviour or outcome.
 
 * To further optimise the aggregation, the database engine has collapsed the `$sort` and `$limit` into a single _special internal_ stage which can perform both actions in one go. In this circumstance, during the sorting process, the aggregation engine only has to track the three currently known youngest person records in memory. It does not have to hold the whole data set in memory when sorting, which may otherwise be resource prohibitive.
 
 * The first stage of the database optimised version of the pipeline is always an _internal_ `$cursor` stage, regardless of the order you placed the pipeline stages in. The `$cursor` _runtime_ stage is always the first action executed. Under the covers, the aggregation engine re-uses the MQL query engine to perform a 'regular' query against the collection, with a filter based on the aggregation's `$match` contents. The aggregation runtime uses the resulting query cursor to pull batches of records. This is similar to how a client application with a MongoDB driver uses a query cursor when remotely invoking an MQL query to pull batches. As with a normal MQL query, the regular database query engine will try to use an index if it makes sense (which it does in this case, as is visible in the embedded  `$queryPlanner` metadata, showing the `"stage" : "IXSCAN"` element and the index used, `"indexName" : "dateofbirth_-1"`). 

 * The query plan indicates that you can manually make an additional optimisation. The `$sort/$limit` combination is not currently pushed up into the internal `$cursor` stage to form part of the initial query. Moving the `$unset` stage from the start to the end of the pipeline will enable this. The pipeline's output won't change, but the `$sort/$limit` processing is now part of the initial query, which you can observe by re-running the explain plan. As a result of this change, the rest of the pipeline has less work to do and will execute faster.
 
You might then ask for the _execution stats_ part of the explain plan:

```javascript
db.persons.explain("executionStats").aggregate(pipeline);
```

Below is a redacted example of the execution statistics you will see in the explain plan, highlighting some of the most relevant metadata elements that you should generally focus on.

```javascript
executionStats: {
  nReturned: 3,
  totalKeysExamined: 3,
  totalDocsExamined: 3,
  executionStages: {
    stage: 'FETCH',
    nReturned: 3,
    docsExamined: 3,
    inputStage: {
      stage: 'IXSCAN',
      nReturned: 3,
      keyPattern: { dateofbirth: -1 },
      indexName: 'dateofbirth_-1',
      direction: 'forward',
      keysExamined: 3,
    }
  }
}
```

Here the plan shows the aggregation uses an index, and because '_index keys examined_' and '_documents examined_' match, this indicates it is fully leveraging the index to identify the required records, which is good news. The targeted index doesn't necessarily mean the aggregation is fully optimised. For example, if there is the need to reduce latency further, you can do some analysis to determine if the index can completely [cover the query](https://docs.mongodb.com/manual/core/query-optimization/#covered-query). Suppose the _cursor query_ part of the aggregation is satisfied entirely using the index and does not have to examine any documents. In that case, you will see `totalDocsExamined = 0` in the explain plan. 

The specific new information shown in `executionStats`, versus the default of `queryPlanner`, is identical to the [normal MQL explain plan](https://docs.mongodb.com/manual/tutorial/analyze-query-plan/) returned for a regular `find()` operation. Consequently, for aggregations, similar principles to MQL apply for spotting things like "have I used the optimum index?" and "does my data model lend itself to efficiently processing the query?".

