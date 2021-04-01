# Using Explain Plans

Often, when using the MongoDB Query Language (MQL) to develop queries, it is useful to view the [explain plan](https://docs.mongodb.com/manual/reference/method/db.collection.explain/) for the query to determine whether the right indexes were used and whether other aspects of the query are fully optimised. An explain plan allows you to better understand the performance implications of the query you have created.

The same applies to aggregation pipelines and the ability to view an _explain plan_ for the executed pipeline. However, with aggregations, an explain plan tends to be even more critical because much more complex logic can be assembled and then executed in the database. Consequently, there are more potential areas for performance bottlenecks to occur, requiring optimisation. As discussed earlier in this book, the MongoDB database engine will do its best to apply its own [aggregation pipeline optimisations](https://docs.mongodb.com/manual/core/aggregation-pipeline-optimization/) at runtime but there will always be some types of optimisations that only the developer can make. This is because a database engine should never optimise a pipeline in such a way as to risk changing the functional behaviour and outcome of the pipeline. The database engine doesn't have the extra context that a developer's brain has, relating to the actual business problem at hand, and is thus unable to make some types of judgement calls about what pipeline changes to apply to make it run faster. This is where the explain plan for aggregations comes in useful for developers. It allows the developer to understand what optimisations the database engine has made and to then spot further potential optimisations that can then be manually made to the pipeline (in addition to just identifying missing indexes).

## Viewing An Explain Plan

To view the explain plan for an aggregation pipeline, a developer can execute commands such as the following:

```javascript
db.coll.explain().aggregate([{"$match": {"name": "Jo"}}]);
```

However, in this book you will already have seen the convention being used to firstly define a separate variable for the pipeline, followed by the call to the `aggregate()` function, passing in the pipeline argument, as shown here:

```javascript
db.coll.aggregate(pipeline);
```

By adopting this approach, it easier to use the same pipeline definition interchangeably, with different commands. For example, whilst prototyping and debugging a pipeline it is handy to be able to quickly switch from executing the pipeline to instead generating the explain plan for the same defined pipeline, as follows:

```javascript
db.coll.explain().aggregate(pipeline);
```

As with MQL, there are three different verbosity modes that an aggregation's explain plan can be generated with, as shown below:

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

In most cases, running the `executionStats` variant is the most useful to developers because, rather than showing just the query planner's 'thinking', it also provides real statistics on the 'winning' executed plan (e.g. the total keys examined, the total docs examined, etc.). However, this isn't the default because it actually executes the aggregation too, in addition to formulating the query plan, which, if the source collection is large and/or the pipeline is sub-optimal, could take a while to return with the explain plan result.

Note, the [aggregate()](https://docs.mongodb.com/manual/reference/method/db.collection.aggregate/) function also provides a vestigial `explain` parameter option to enable an explain plan to be generated and returned. However this is more limited and cumbersome to use, and so nowadays is best avoided.


## Understanding The Explain Plan

As an example, let's assume there is a data-set of information on people (e.g. a collection called _persons_ with an index defined on a _date of birth_ field). The following aggregation pipeline may have then been built to show the three youngest people in the collection, only for people born on or after 1970 (so there may be less than 3 records in the result if nearly all people were born before 1970):

```javascript
var pipeline = [
  {"$unset" : [
      "_id",
      "address",
      "person_id"
  ]},
  
  {"$sort" : {
      "dateofbirth" : -1
  }},
  
  {"$match" : {
      "dateofbirth" : {"$gte" : ISODate("1970-01-01T00:00:00Z")}
  }},
  
  {"$limit" : 3}
]
```

The _query planner_ part of the explain plan might then be requested:

```javascript
db.persons.explain("queryPlanner").aggregate(pipeline);
```

The query plan ouput for this pipeline shows the following (some less relevant information has been edited out for brevity)

```javascript
stages : [
  {$cursor : {
    queryPlanner : {
      parsedQuery : {
        dateofbirth : {
          $gte : ISODate("1970-01-01T00:00:00Z")
        }
      },
      winningPlan : {
        stage : "FETCH",
        inputStage : {
          stage : "IXSCAN",
          keyPattern : {
            dateofbirth : -1
          },
          indexName : "dateofbirth_-1",
          direction : "forward",
          indexBounds : {
            dateofbirth : [
              "[new Date(9223372036854775807), new Date(0)]"
            ]
          }
        }
      }
    }
  }},
  
  {$project : {
      _id : false,
      person_id : false,
      address : false
    }
  },
  {$sort : {
      sortKey : {
        dateofbirth : -1
      },
      limit : NumberLong(3)
    }
  }
]
```

There are some interesting insights that can be deduced from this query plan:

 * To optimise the aggregation, the database engine has reordered the pipeline and moved the filter from the `$match` to the top of the pipeline, without changing the functional behaviour or outcome of the pipeline.
 
 * To optimise the aggregation, the database engine has been able to collapse the `$sort` and `$limit` into a single _special internal_ stage which can perform both actions in one go. In this case, the aggregation engine only has to track, in memory, the 3 currently known youngest person records at any point in time, during the sorting process, rather than holding the whole data-set being sorted in memory, which may otherwise be resource prohibitive.
 
 * The first stage of the executed _internal runtime_ version of the pipeline, regardless of what order stages were placed in the pipeline by the developer, is always an _internal_ `$cusror` stage. The `$cursor` _runtime_ stage is the first thing that happens for any executing aggregation. The aggregation engine re-uses the MQL query engine to perform a 'regular' query against the collection, optionally including a filter based on the contents of the aggregation's `$match`, if a `$match` was defined and if it occurs early in the optimised pipeline. The aggregation runtime uses the resulting query cursor to pull batches of records at a time, just like a client application using a MongoDB driver would do when remotely invoking an MQL query against a database collection. As with a normal MQL query, the regular database query engine will try to use an index if it makes sense (which it does in this case, as is visible in the embedded  `$queryPlanner` metadata, showing the `"stage" : "IXSCAN"` element and the index used, `"indexName" : "dateofbirth_-1"`). 

The _execution stats_ part of the explain plan might then be asked for:

```javascript
db.persons.explain("executionStats").aggregate(pipeline);
```

Below is a redacted example of the resulting execution statistics in the explain plan, highlighting some of the most important metadata elements that developers should typically focus on.

```javascript
executionStats : {
  nReturned : 333333,
  totalKeysExamined : 333333,
  totalDocsExamined : 333333,
  ...
  executionStages : {
    stage : "FETCH",
    nReturned : 333333,
    docsExamined : 333333,
    ...
    inputStage : {
      stage : "IXSCAN",
      nReturned : 333333,
      indexName : "dateofbirth_-1",
      direction : "forward",
      keysExamined : 333333,
      ...
}
```

Here the plan shows that an index was used, and because 'index keys examined' and 'documents examined' match, this indicates that the index was fully leveraged to completely identify the required records, which is good news. This doesn't necessarily mean the aggregation is fully optimal though. For example, if there was the need to reduce latency further, some analysis could be done to determine if the the index can completely [cover the query](https://docs.mongodb.com/manual/core/query-optimization/#covered-query). If the _cursor query_ part of the the aggregation is satisfied entirely using the index and does not have to examine any documents, you would see `totalDocsExamined = 0` in the resulting explain plan. 

The specific new information shown in `executionStats`, versus the default of `queryPlanner`, is identical to the [normal MQL explain plan](https://docs.mongodb.com/manual/tutorial/analyze-query-plan/) returned for a regular `find()` operation. As a consequence, similar principles apply for spotting things like 'has the optimum index been used?', and 'does the data model lend itself to efficiently processing the query?'.

