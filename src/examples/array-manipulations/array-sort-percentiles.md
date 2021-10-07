# Array Sorting & Percentiles

__Minimum MongoDB Version:__ 4.2


## Scenario

You have been conducting performance testing of an application's API with the results of each "test run" captured in a document in a database. Each "test run" document contains an array of multiple response times that the test recorded during its execution. You need to analyse the recorded data to identify the slow tests. To achieve this, you want to calculate the [median](https://en.wikipedia.org/wiki/Median) (50th percentile) and 90th [percentile](https://en.wikipedia.org/wiki/Percentile) response times for each "test run" document and then only keep documents where the 90th percentile response time is greater than 100 milliseconds.

> _This example chapter uses a slightly modified version of a "expression generator" [macro function for sorting arrays](https://github.com/asya999/bits-n-pieces/blob/master/scripts/sortArray.js) created by [Asya Kamsky](https://twitter.com/asya999). Adopting this approach avoids the need for you to use the combination of `$unwind`, `$sort`, and `$group` stages. Instead, you process each document's array in isolation for [optimum performance](../../guides/performance.md#2-avoid-unwinding--regrouping-documents-just-to-process-array-elements). You can re-use this chapter's `sortArray()` function as-is for your own situations where you need to sort an array field's contents._


## Sample Data Population

Drop any old version of the database (if it exists) and then populate the test run results documents:

```javascript
use book-inline-array-sort-percentile;
db.dropDatabase();

// Create index on the responseTimesMillis array field
db.performance_test_results.createIndex({"responseTimesMillis": 1});

// Insert 7 records into the performance_test_results collection
db.performance_test_results.insertMany([
  {
    "testRun": 1,
    "datetime": ISODate("2021-08-01T22:51:27.638Z"),
    "responseTimesMillis": [
      62, 97, 59, 104, 97, 71, 62, 115, 82, 87,
    ],
  },
  {
    "testRun": 2,
    "datetime": ISODate("2021-08-01T22:56:32.272Z"),
    "responseTimesMillis": [
      34, 63, 51, 104, 87, 63, 64, 86, 105, 51, 73,
      78, 59, 108, 65, 58, 69, 106, 87, 93, 65,
    ],
  },
  {
    "testRun": 3,
    "datetime": ISODate("2021-08-01T23:01:08.908Z"),
    "responseTimesMillis": [
      56, 72, 83, 95, 107, 83, 85,
    ],
  },
  {
    "testRun": 4,
    "datetime": ISODate("2021-08-01T23:17:33.526Z"),
    "responseTimesMillis": [
      78, 67, 107, 110,
    ],
  },
  {
    "testRun": 5,
    "datetime": ISODate("2021-08-01T23:24:39.998Z"),
    "responseTimesMillis": [
      75, 91, 75, 87, 99, 88, 55, 72, 99, 102,
    ],
  },
  {
    "testRun": 6,
    "datetime": ISODate("2021-08-01T23:27:52.272Z"),
    "responseTimesMillis": [
      88, 89,
    ],
  },
  {
    "testRun": 7,
    "datetime": ISODate("2021-08-01T23:31:59.917Z"),
    "responseTimesMillis": [
      101,
    ],
  },
]);
```


## Aggregation Pipeline

Define the new `sortArray()` function for sorting the contents of an array field ready for you to use in a pipeline:

```javascript
// Macro function to generate complex aggregation expression for sorting an array
function sortArray(sourceArrayField) {
  return {
    // GENERATE A BRAND NEW ARRAY WHICH CONTAINS THE ELEMENTS OF THE SOURCE ARRAY BUT NOW SORTED
    "$reduce": {
      "input": sourceArrayField, 
      "initialValue": [],   // THE FIRST VERSION OF A TEMPORARY SORTED ARRAY WILL BE EMPTY
      "in": {
        "$let": {
          "vars": {  // CAPTURE $$this & $$value FROM OUTER $reduce AS THEY WILL BE OVERRIDDEN BY INNER $reduce BELOW
            "resultArray": "$$value",
            "currentSourceArrayElement": "$$this"
          },   
          "in": {
            "$let": {
              "vars": { 
                // FIND EACH SOURCE ARRAY'S CURRENT ELEMENT POSITION IN THE NEW SORTED TEMPORARY ARRAY BEING BUILT UP
                "targetArrayPosition": {
                  "$reduce": { 
                    "input": {"$range": [0, {"$size": "$$resultArray"}]},  // CREATE SEQUENCE OF "0,1,2...<array-size>"
                    "initialValue": {"$size": "$$resultArray"},   // SET THE INITIAL SORTED POSITION TO BE LAST ARRAY ELEMENT POSITION
                    "in": {  // LOOP THRU "0,1,2...<array-size>"
                      "$cond": [ 
                        {"$lt": ["$$currentSourceArrayElement", {"$arrayElemAt": ["$$resultArray", "$$this"]}]}, 
                        {"$min": ["$$value", "$$this"]},  // ONLY USE CURRENT LOW VALUE IF A LOW VALUE NOT ALREADY FOUND
                        "$$value"  // RETAIN THE INITIAL VALUE AGAIN AS NOT YET FOUND THE ELEMENT'S CORRECT POSITION
                      ]
                    }
                  }
                }
              },
              "in": {
                // REBUILD NEW TEMP VERSION OF SORTED ARRAY BY SLICING OLDER TEMPORARY VERSION & INSERTING THE NEW ELEMENT IN-BETWEEN
                "$concatArrays": [
                  {"$cond": [   // RETAIN THE EXISTING FIRST PART OF THE NEW ARRAY
                    {"$eq": [0, "$$targetArrayPosition"]}, 
                    [],
                    {"$slice": ["$$resultArray", 0, "$$targetArrayPosition"]},
                  ]},
                  ["$$currentSourceArrayElement"],   // PULL IN THE NEW POSITIONED ELEMENT
                  {"$cond": [   // RETAIN THE EXISTING LAST PART OF THE NEW ARRAY
                    {"$gt": [{"$size": "$$resultArray"}, 0]}, 
                    {"$slice": ["$$resultArray", "$$targetArrayPosition", {"$size": "$$resultArray"}]},
                    [],
                  ]},
                ]
              } 
            }
          }
        }
      }
    }      
  };
}
```

Define the new arrayElemAtPercentile(n) function for capturing the element of a sorted array at the nth percentile position:

```javascript
// Macro function to find the nth percentile element of a sorted version of an array
function arrayElemAtPercentile(sourceArrayField, percentile) {
  return {    
    "$let": {
      "vars": {
        "sortedArray": sortArray(sourceArrayField), 
      },
      "in": {         
        "$arrayElemAt": [  // FIND ELEMENT OF ARRAY AT NTH PERCENTILE POSITION
          "$$sortedArray",
          {"$subtract": [  // ARRAY IS 0-INDEX BASED SO SUBTRACT 1 TO GET POSITION
            {"$ceil":  // FIND NTH ELEMENT IN THE ARRAY, ROUNDED UP TO NEAREST integer
              {"$multiply": [
                {"$divide": [percentile, 100]},
                {"$size": "$$sortedArray"}
              ]}
            },
            1
          ]}
        ]
      }
    }
  };
}
```

Define the pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Capture new fields for the ordered array + various percentiles
  {"$set": {
    "sortedResponseTimesMillis": sortArray("$responseTimesMillis"),
    "medianTimeMillis": arrayElemAtPercentile("$responseTimesMillis", 50),
    "ninetiethPercentileTimeMillis": arrayElemAtPercentile("$responseTimesMillis", 90),
  }},
  
  // Only show results for tests with slow tail latencies (i.e. 90th percentile responses >100ms)
  {"$match": {
    "ninetiethPercentileTimeMillis": {"$gt": 100},
  }},
  
  // Exclude unrequired fields from each record
  {"$unset": [
    "_id",
    "datetime",
    "responseTimesMillis",
  ]},    
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.performance_test_results.aggregate(pipeline);

db.performance_test_results.explain("executionStats").aggregate(pipeline);
```


## Expected Results

Five documents should be returned, representing the subset of documents with a 90th percentile response time greater than 100 milliseconds, as shown below:

```javascript
[
  {
    testRun: 7,
    sortedResponseTimesMillis: [ 101 ],
    medianTimeMillis: 101,
    ninetiethPercentileTimeMillis: 101
  },
  {
    testRun: 1,
    sortedResponseTimesMillis: [
      59, 62, 62,  71,  82,
      87, 97, 97, 104, 115
    ],
    medianTimeMillis: 82,
    ninetiethPercentileTimeMillis: 104
  },
  {
    testRun: 2,
    sortedResponseTimesMillis: [
      34, 51, 51,  58,  59,  63,  63,
      64, 65, 65,  69,  73,  78,  86,
      87, 87, 93, 104, 105, 106, 108
    ],
    medianTimeMillis: 69,
    ninetiethPercentileTimeMillis: 105
  },
  {
    testRun: 3,
    sortedResponseTimesMillis: [
      56, 72,  83, 83,
      85, 95, 107
    ],
    medianTimeMillis: 83,
    ninetiethPercentileTimeMillis: 107
  },
  {
    testRun: 4,
    sortedResponseTimesMillis: [ 67, 78, 107, 110 ],
    medianTimeMillis: 78,
    ninetiethPercentileTimeMillis: 110
  }
]
```


## Observations

 * __Macro Functions.__ In this chapter, you employ two functions, sortArray() and arrayElemAtPercentile(), to generate portions of aggregation [boilerplate code](https://en.wikipedia.org/wiki/Boilerplate_code). These functions are essentially [macros](https://en.wikipedia.org/wiki/Macro_(computer_science)). You invoke these functions from within the pipeline you create in the MongoDB Shell. Each function you invoke embeds the returned boilerplate code into the pipeline's code. You can see this in action by typing the text pipeline into the Shell and pressing enter. (not you may have to increase the depth displayed in `monogosh` first by issuing the command `config.set("inspectDepth", 100)` in `mongosh`. This action will display a single large piece of code representing the whole pipeline, including the macro-generated code. The aggregation runtime never sees or runs the functions sortArray() and arrayElemAtPercentile() directly. Of course, you won't use JavaScript functions to generate composite expressions if you use a different programming language and [MongoDB Driver](https://docs.mongodb.com/drivers/). You will use the relevant features of your specific programming language to assemble composite expression objects instead.

 * __Sorting On Primitives Only.__ The sort function in this chapter will correctly sort arrays containing just primitive values, such as integers, floats, date-times and strings. However, if an array's members are objects (i.e. each has its own fields and values), the code will not sort the array correctly. It is possible to construct a function to enable the sorting of an array of objects, but such a function will be more complex and beyond the scope of this chapter.

 * __Comparison With Classic Sorting Algorithms.__ Despite being more optimal than unwinding and re-grouping arrays to bring them back into the same documents, the sorting code will be slow compared with commonly recognised computer science [sorting algorithms](https://en.wikipedia.org/wiki/Sorting_algorithm). This situation is due to the limitations of the aggregation domain language compared with a general-purpose programming language. The performance difference will be negligible for arrays with a small number of elements (probably up to a few tens of members). For larger arrays containing hundreds of members or more, the degradation in performance is likely to be more profound.

 * __Why Isn’t There A Native “$sortArray” Expression?.__ As you've seen, the composite set of expressions you must generate to perform an inline sort operation on an array is complex, in addition to being computationally suboptimal. If you are writing aggregations using JavaScript for the MongoDB Shell, you can copy the function provided in this chapter. However, in most "production" situations, you will be using a different programming language. Consequently, you would first need to port the example macro function to your language. Ideally, the Aggregation Framework would provide a native and optimised array operator expression for this, for example, called `$sortArray`. Ideally, this would take optional parameters, to:
 
     1. Indicate whether the ordering should be ascending or descending (defaulting to ascending)
     2. Name a field (or fields) in each array element to sort by, rather than the default of sorting by each array element "as a whole"
     
     You can upvote the MongoDB enhancement request "[Add an expression to sort an array](https://jira.mongodb.org/browse/SERVER-29425)" if you would like to register your desire for a native sort operator expression.

