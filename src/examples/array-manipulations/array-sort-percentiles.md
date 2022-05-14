# Array Sorting & Percentiles

__Minimum MongoDB Version:__ 4.2


## Scenario

You've conducted performance testing of an application with the results of each "test run" captured in a database. Each record contains a set of response times for the test run. You want to analyse the data from multiple runs to identify the slowest ones. You calculate the median (50th percentile) and 90th percentile response times for each test run and only keep results where the 90th percentile response time is greater than 100 milliseconds.

> _For MongoDB version 5.1 and earlier, the example will use a modified version of an "expression generator" [function for inline sorting of arrays](https://github.com/asya999/bits-n-pieces/blob/master/scripts/sortArray.js) created by [Asya Kamsky](https://twitter.com/asya999). Adopting this approach avoids the need for you to use the combination of `$unwind`, `$sort`, and `$group` stages. Instead, you process each document's array in isolation for [optimum performance](../../guides/performance.md#2-avoid-unwinding--regrouping-documents-just-to-process-array-elements). You can re-use this chapter's custom `sortArray()` function as-is for your own situations where you need to sort an array field's contents. For MongoDB version 5.2 and greater, you can instead use MongoDB's new [$sortArray](https://docs.mongodb.com/v5.3/reference/operator/aggregation/sortArray/) operator._


## Sample Data Population

Drop any old version of the database (if it exists) and then populate the test run results documents:

```javascript
use book-inline-array-sort-percentile;
db.dropDatabase();

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

If you are using version 5.1 or earlier of MongoDB, you need to define the following custom `sortArray()` function for inline sorting of the contents of an array field, ready for you to use in a pipeline:

```javascript
// Macro function to generate a complex aggregation expression for sorting an array
// This function isn't required for MongoDB version 5.2+ due to the new $sortArray operator
function sortArray(sourceArrayField) {
  return {
    // GENERATE BRAND NEW ARRAY TO CONTAIN THE ELEMENTS FROM SOURCE ARRAY BUT NOW SORTED
    "$reduce": {
      "input": sourceArrayField, 
      "initialValue": [],  // THE FIRST VERSION OF TEMP SORTED ARRAY WILL BE EMPTY
      "in": {
        "$let": {
          "vars": {  // CAPTURE $$this & $$value FROM OUTER $reduce BEFORE OVERRIDDEN
            "resultArray": "$$value",
            "currentSourceArrayElement": "$$this"
          },   
          "in": {
            "$let": {
              "vars": { 
                // FIND EACH SOURCE ARRAY'S CURRENT ELEMENT POSITION IN NEW SORTED ARRAY
                "targetArrayPosition": {
                  "$reduce": { 
                    "input": {"$range": [0, {"$size": "$$resultArray"}]},  // "0,1,2.."
                    "initialValue": {  // INITIALISE SORTED POSITION TO BE LAST ARRAY ELEMENT
                      "$size": "$$resultArray"
                    },
                    "in": {  // LOOP THRU "0,1,2..."
                      "$cond": [ 
                        {"$lt": [
                          "$$currentSourceArrayElement",
                          {"$arrayElemAt": ["$$resultArray", "$$this"]}
                        ]}, 
                        {"$min": ["$$value", "$$this"]},  // ONLY USE IF LOW VAL NOT YET FOUND
                        "$$value"  // RETAIN INITIAL VAL AGAIN AS NOT YET FOUND CORRECT POSTN
                      ]
                    }
                  }
                }
              },
              "in": {
                // BUILD NEW SORTED ARRAY BY SLICING OLDER ONE & INSERTING NEW ELEMENT BETWEEN
                "$concatArrays": [
                  {"$cond": [  // RETAIN THE EXISTING FIRST PART OF THE NEW ARRAY
                    {"$eq": [0, "$$targetArrayPosition"]}, 
                    [],
                    {"$slice": ["$$resultArray", 0, "$$targetArrayPosition"]},
                  ]},
                  ["$$currentSourceArrayElement"],  // PULL IN THE NEW POSITIONED ELEMENT
                  {"$cond": [  // RETAIN THE EXISTING LAST PART OF THE NEW ARRAY
                    {"$gt": [{"$size": "$$resultArray"}, 0]}, 
                    {"$slice": [
                      "$$resultArray",
                      "$$targetArrayPosition",
                      {"$size": "$$resultArray"}
                    ]},
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

Define the new `arrayElemAtPercentile()` function for capturing the element of a sorted array at the nth percentile position:

```javascript
// Macro function to find nth percentile element of a sorted version of an array
function arrayElemAtPercentile(sourceArrayField, percentile) {
  return {    
    "$let": {
      "vars": {
        "sortedArray": sortArray(sourceArrayField), 
        // Comment out the line above and uncomment the line below if running MDB 5.2 or greater
        // "sortedArray": {"$sortArray": {"input": sourceArrayField, "sortBy": 1}},        
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
> _If running MongoDB version 5.2 or greater, you can instead comment/uncomment the specific lines indicated in the code above to leverage MongoDB's new `$sortArray` operator_

Define the pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Capture new fields for the ordered array + various percentiles
  {"$set": {
    "sortedResponseTimesMillis": sortArray("$responseTimesMillis"),
    // Comment out the line above and uncomment the line below if running MDB 5.2 or greater
    // "sortedResponseTimesMillis": {"$sortArray": {"input": "$responseTimesMillis", "sortBy": 1}},
    "medianTimeMillis": arrayElemAtPercentile("$responseTimesMillis", 50),
    "ninetiethPercentileTimeMillis": arrayElemAtPercentile("$responseTimesMillis", 90),
  }},

  // Only show results for tests with slow latencies (i.e. 90th%-ile responses >100ms)
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

> _If running MongoDB version 5.2 or greater, you can instead comment/uncomment the specific lines indicated in the code above to leverage MongoDB's new `$sortArray` operator_


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.performance_test_results.aggregate(pipeline);
```

```javascript
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

 * __Macro Functions.__ In this chapter, you employ two functions, `sortArray()` and `arrayElemAtPercentile()`, to generate portions of aggregation [boilerplate code](https://en.wikipedia.org/wiki/Boilerplate_code). These functions are essentially [macros](https://en.wikipedia.org/wiki/Macro_(computer_science)). You invoke these functions from within the pipeline you create in the MongoDB Shell. Each function you invoke embeds the returned boilerplate code into the pipeline's code. You can see this in action by typing the text `pipeline` into the Shell and pressing _enter_. Note, you may first have to increase the depth displayed in _mongosh_ by issuing the _mongosh_ command `config.set("inspectDepth", 100)`. This action will display a single large piece of code representing the whole pipeline, including the macro-generated code. The aggregation runtime never sees or runs the custom functions `sortArray()` and `arrayElemAtPercentile()` directly. Of course, you won't use JavaScript functions to generate composite expressions if you use a different programming language and [MongoDB Driver](https://docs.mongodb.com/drivers/). You will use the relevant features of your specific programming language to assemble composite expression objects.

 * __Sorting On Primitives Only.__ The custom `sortArray()` function used for MongoDB versions 5.1 and earlier will sort arrays containing just primitive values, such as integers, floats, date-times and strings. However, if an array's members are objects (i.e. each has its own fields and values), the code will not sort the array correctly. It is possible to enhance the function to enable sorting an array of objects, but this enhancement is not covered here. For MongoDB versions 5.2 and greater, the new `$sortArray` operator provides options to easily sort an array of objects.

 * __Comparison With Classic Sorting Algorithms.__ Despite being more optimal than unwinding and re-grouping arrays to bring them back into the same documents, the custom sorting code will be slower than commonly recognised computer science [sorting algorithms](https://en.wikipedia.org/wiki/Sorting_algorithm). This situation is due to the limitations of the aggregation domain language compared with a general-purpose programming language. The performance difference will be negligible for arrays with few elements (probably up to a few tens of members). For larger arrays containing hundreds of members or more, the degradation in performance will be more profound. For MongoDB versions 5.2 and greater, the new `$sortArray` operator leverages a fully optimised sorting algorithm under the covers to avoid this issue.

