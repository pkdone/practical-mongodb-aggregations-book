# Two Array Fields Comparison

__Minimum MongoDB Version:__ 4.2  <-- TODO: uses $first


## Scenario

You TODO.


## Sample Data Population

Drop any old version of the database (if it exists) and then populate the deployments documents:

```javascript
use('book-two-array-fields-comparison');
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

You first need to define the following two functions, one to TODO, the other TODO, ready for you to use in a pipeline:

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

  // Add 'state' field and only show 'differences' field if there are differences
  {"$set": {
    // Set 'state' to ADDED, REMOVED, MODIFIED or UNCHANGED accordingly
    "state": {
      "$switch": {        
        "branches": [
          {
            "case": {
              "$and": [
                {"$eq": [{"$type": "$differences"}, "null"]},
                {"$eq": [{"$type": "$beforeConfig"}, "missing"]},
              ]
            },
            "then": "ADDED"
          },
          {
            "case": {
              "$and": [
                {"$eq": [{"$type": "$differences"}, "null"]},
                {"$eq": [{"$type": "$afterConfig"}, "missing"]},
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

TODO documents should be returned, TODO, as shown below:

```javascript
[
  {
    "name": "ProdServer",
    "state": "MODIFIED",
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
    "state": "MODIFIED",
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
    "state": "REMOVED"
  },
  {
    "name": "IntegrationServer",
    "state": "UNCHANGED"
  },
  {
    "name": "DevServer",
    "state": "ADDED"
  }
]
```


## Observations

 * __Macro Functions.__ Like the prevuous example (LINK) todo.

 * __Todo.__ TODO.

