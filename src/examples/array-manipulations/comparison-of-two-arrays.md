# Comparison Of Two Arrays

__Minimum MongoDB Version:__ 4.4 &nbsp;&nbsp; _(due to use of [`$first`](https://docs.mongodb.com/manual/reference/operator/aggregation/first-array-element/) array operator)_


## Scenario

You are an IT administrator managing some virtual machine deployments in a data centre to host a critical business application in a few environments (e.g. "Production", "QA"). A database collection captured the configuration state of each virtual machine across two days. You want to generate a report showing what configuration changes people made to the virtual machines (if any) between these two days.  


## Sample Data Population

Drop any old version of the database (if it exists) and then populate the deployments collection:

```javascript
use book-comparison-of-two-arrays;
db.dropDatabase();

// Insert 5 records into the deployments collection
db.deployments.insertMany([
  {
    "name": "ProdServer",
    "beforeTimestamp": ISODate("2022-01-01T00:00:00Z"),
    "afterTimestamp": ISODate("2022-01-02T00:00:00Z"),
    "beforeConfig": {
      "vcpus": 8,
      "ram": 128,
      "storage": 512,
      "state": "running",
    },
    "afterConfig": {
      "vcpus": 16,
      "ram": 256,
      "storage": 512,
      "state": "running",
    },    
  },
  {
    "name": "QAServer",
    "beforeTimestamp": ISODate("2022-01-01T00:00:00Z"),
    "afterTimestamp": ISODate("2022-01-02T00:00:00Z"),
    "beforeConfig": {
      "vcpus": 4,
      "ram": 64,
      "storage": 512,
      "state": "paused",
    },
    "afterConfig": {
      "vcpus": 4,
      "ram": 64,
      "storage": 256,
      "state": "running",
      "extraParams": "disableTLS;disableCerts;"
    },    
  },
  {
    "name": "LoadTestServer",
    "beforeTimestamp": ISODate("2022-01-01T00:00:00Z"),
    "beforeConfig": {
      "vcpus": 8,
      "ram": 128,
      "storage": 256,
      "state": "running",
    },
  },
  {
    "name": "IntegrationServer",
    "beforeTimestamp": ISODate("2022-01-01T00:00:00Z"),
    "afterTimestamp": ISODate("2022-01-02T00:00:00Z"),
    "beforeConfig": {
      "vcpus": 4,
      "ram": 32,
      "storage": 64,
      "state": "running",
    },
    "afterConfig": {
      "vcpus": 4,
      "ram": 32,
      "storage": 64,
      "state": "running",
    },
  },
  {
    "name": "DevServer",
    "afterTimestamp": ISODate("2022-01-02T00:00:00Z"),
    "afterConfig": {
      "vcpus": 2,
      "ram": 16,
      "storage": 64,
      "state": "running",
    },
  },
]);
```


## Aggregation Pipeline

You first need to define the following two functions, one to get all the unique keys from two different arrays, the other to get the value of a field only known at runtime, ready for you to use in a pipeline:

```javascript
// Macro function to generate a complex expression to get all the unique keys
// from two sub-documents returned as an array of the unique keys
function getArrayOfTwoSubdocsKeysNoDups(firstArrayRef, secondArrayRef) {
  return {
    "$setUnion": {
      "$concatArrays": [
        {"$map": {
          "input": {"$objectToArray": firstArrayRef},
          "in": "$$this.k",
        }},
        {"$map": {
          "input": {"$objectToArray": secondArrayRef},
          "in": "$$this.k",
        }},
      ]
    }
  };
}

// Macro function to generate a complex expression to get the value of a field
// in a document where the field's name is only known at runtime 
function getDynamicField(obj, fieldname) {
  return {
    "$first": [ 
      {"$map": { 
        "input": {
          "$filter": { 
            "input": {"$objectToArray": obj}, 
            "as": "currObj",
            "cond": {"$eq": ["$$currObj.k", fieldname]} 
          }
        }, 
        in: "$$this.v" 
      }}, 
    ]
  };
}
```

Define the pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Compare two different arrays in the same document & get the differences (if any)
  {"$set": {
    "differences": {
      "$reduce": {
        "input": getArrayOfTwoSubdocsKeysNoDups("$beforeConfig", "$afterConfig"),
        "initialValue": [],
        "in": {
          "$concatArrays": [
            "$$value",
            {"$cond": {
              "if": {
                "$ne": [
                  getDynamicField("$beforeConfig", "$$this"),
                  getDynamicField("$afterConfig", "$$this"),
                ]
              },
              "then": [{
                "field": "$$this",
                "change": {
                  "$concat": [
                    {"$ifNull": [{"$toString": getDynamicField("$beforeConfig", "$$this")}, "<not-set>"]},
                    " --> ",
                    {"$ifNull": [{"$toString": getDynamicField("$afterConfig", "$$this")}, "<not-set>"]},
                  ]
                },
              }],
              "else": [],
            }}
          ]
        }
      }
    },
  }},

  // Add 'status' field and only show 'differences' field if there are differences
  {"$set": {
    // Set 'status' to ADDED, REMOVED, MODIFIED or UNCHANGED accordingly
    "status": {
      "$switch": {        
        "branches": [
          {
            "case": {
              "$and": [
                {"$eq": [{"$type": "$differences"}, "null"]},
                {"$or": [
                  {"$eq": [{"$type": "$beforeConfig"}, "null"]},
                  {"$eq": [{"$type": "$beforeConfig"}, "missing"]},
                ]},
              ]
            },
            "then": "ADDED"
          },
          {
            "case": {
              "$and": [
                {"$eq": [{"$type": "$differences"}, "null"]},
                {"$or": [
                  {"$eq": [{"$type": "$afterConfig"}, "null"]},
                  {"$eq": [{"$type": "$afterConfig"}, "missing"]},
                ]},
              ]
            },
            "then": "REMOVED"
          },
          {"case": {"$lte": [{"$size": "$differences"}, 0]}, "then": "UNCHANGED"},
          {"case": {"$gt":  [{"$size": "$differences"}, 0]}, "then": "MODIFIED"},
        ],
        "default": "UNKNOWN",
      }
    },

    // If there are differences, keep the differences field, otherwise remove it
    "differences": {
      "$cond": [
        {"$or": [
          {"$eq": [{"$type": "$differences"}, "null"]},
          {"$lte": [{"$size": "$differences"}, 0]},
        ]},
        "$$REMOVE", 
        "$differences"
      ]
    },
  }},         

  // Remove unwanted fields
  {"$unset": [
    "_id",
    "beforeTimestamp",
    "afterTimestamp",
    "beforeConfig",
    "afterConfig",
  ]},
];   
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.deployments.aggregate(pipeline);
```

```javascript
db.deployments.explain("executionStats").aggregate(pipeline);
```


## Expected Results

Five documents should be returned, showing whether anyone added, removed or modified a deployment or left it unchanged, with the deployment's changes shown if modified, as shown below:

```javascript
[
  {
    "name": "ProdServer",
    "status": "MODIFIED",
    "differences": [
      {
        "field": "vcpus",
        "change": "8 --> 16"
      },
      {
        "field": "ram",
        "change": "128 --> 256"
      }
    ]
  },
  {
    "name": "QAServer",
    "status": "MODIFIED",
    "differences": [
      {
        "field": "storage",
        "change": "512 --> 256"
      },
      {
        "field": "state",
        "change": "paused --> running"
      },
      {
        "field": "extraParams",
        "change": "<not-set> --> disableTLS;disableCerts;"
      }
    ]
  },
  {
    "name": "LoadTestServer",
    "status": "REMOVED"
  },
  {
    "name": "IntegrationServer",
    "status": "UNCHANGED"
  },
  {
    "name": "DevServer",
    "status": "ADDED"
  }
]
```


## Observations

 * __Reusable Macro Functions.__ As with many of the other _Array Manipulation Examples_, the aggregation uses macro functions to generate boilerplate code for use in the pipeline. These functions are general-purpose and reusable as-is in other solutions.

 * __Sub-Document Comparison.__ The pipeline provides a generic way to compare the topmost fields hanging off two sub-document fields. The comparison will only work for sub-document fields with primitive values (e.g. String, Double, Null, Date, Boolean, etc.). The comparison will not work if a sub-document's field is an Array or Object. The pipeline finds all the field names ('keys') appearing in either sub-document. For each field name, the pipeline then compares if it exists in both sub-documents, and if the values don't match, it incorporates the two different values in the output.

 * __Potential Need For Earlier Stages.__ The example source documents already embed two fields to compare, each corresponding to the deployment's configuration captured at a different point in time (`beforeTimestamp` and `afterTimestamp`). In real-world data models, these two configuration snapshots would be more likely to correspond to two different records in a collection, not one combined record. However, it doesn't mean that this example is redundant. In such cases, you would include the following additional stages at the start of the example's pipeline: 
    - `$sort` to sort all records by timestamp regardless of which deployment each corresponds to.
    - `$group` to group on the name of the deployment. Inside this group stage, you would use a `$first` operator to capture the first document's `config` into a new `beforeConfig` field and a `$last` operator to capture the last document's `config` into a new `afterConfig` field.

    The rest of the pipeline from the example would then be used unchanged.

