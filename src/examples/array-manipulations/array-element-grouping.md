# Array Element Grouping

__Minimum MongoDB Version:__ 4.2


## Scenario

You want to provide a report for your online game showing the total "coin" rewards each gaming user has accumulated. The challenge is that the source collection captures each time the game awards a user with a type of coin in a growing array field containing many elements. However,  for each gamer, you want to show totals for each coin type in an array instead. An extra complication exists in that you don't know ahead of time what all the possible coin types can be when developing the solution. For example, the game could introduce different coin types in the future (e.g. "tungsten coins").

## Sample Data Population

Drop any old version of the database (if it exists) and then populate the user rewards documents:

```javascript
use book-array-element-grouping;
db.dropDatabase();

// Insert 3 records into the user_rewards collection
db.user_rewards.insertMany([
  {
    "userId": 123456789,
    "rewards": [
      {"coin": "gold", "amount": 25, "date": ISODate("2022-11-01T09:25:23Z")},
      {"coin": "bronze", "amount": 100, "date": ISODate("2022-11-02T11:32:56Z")},
      {"coin": "silver", "amount": 50, "date": ISODate("2022-11-09T12:11:58Z")},
      {"coin": "gold", "amount": 10, "date": ISODate("2022-11-15T12:46:40Z")},
      {"coin": "bronze", "amount": 75, "date": ISODate("2022-11-22T12:57:01Z")},
      {"coin": "gold", "amount": 50, "date": ISODate("2022-11-28T19:32:33Z")},
    ],
  },
  {
    "userId": 987654321,
    "rewards": [
      {"coin": "bronze", "amount": 200, "date": ISODate("2022-11-21T14:35:56Z")},
      {"coin": "silver", "amount": 50, "date": ISODate("2022-11-21T15:02:48Z")},
      {"coin": "silver", "amount": 50, "date": ISODate("2022-11-27T23:04:32Z")},
      {"coin": "silver", "amount": 50, "date": ISODate("2022-11-27T23:29:47Z")},
      {"coin": "bronze", "amount": 500, "date": ISODate("2022-11-27T23:56:14Z")},
    ],
  },
  {
    "userId": 888888888,
    "rewards": [
      {"coin": "gold", "amount": 500, "date": ISODate("2022-11-13T13:42:18Z")},
      {"coin": "platinum", "amount": 5, "date": ISODate("2022-11-19T15:02:53Z")},
    ],
  },
]);
```


## Aggregation Pipeline

You first need to define the following two array element grouping functions ready for you to use in a pipeline (one to perform group "counting" and the other to perform group "summing"):

```javascript
// Macro function to generate a complex expression to group an array field's
// content by the value of a field occurring in each array element, counting
// the number of times it occurs
function arrayGroupByCount(arraySubdocField, groupByKeyField) {
  return {
    "$map": {
      "input": {
        "$setUnion": {
          "$map": {
            "input": `$${arraySubdocField}`,
            "in": `$$this.${groupByKeyField}`
          }
        }
      },
      "as": "key",
      "in": {
        "id": "$$key",
        "count": {
          "$size": {
            "$filter": {
              "input": `$${arraySubdocField}`,
              "cond": {
                "$eq": [`$$this.${groupByKeyField}`, "$$key"]
              }
            }
          }
        }
      }
    }
  };
}

// Macro function to generate a complex expression to group an array field's
// content by the value of a field occurring in each array element, summing
// the values from a corresponding amount field in each array element
function arrayGroupBySum(arraySubdocField, groupByKeyField, groupByValueField) {
  return {
    "$map": {
      "input": {
        "$setUnion": {
          "$map": {
            "input": `$${arraySubdocField}`,
            "in": `$$this.${groupByKeyField}`
          }
        }
      },
      "as": "key",
      "in": {
        "id": "$$key",
        "total": {
          "$reduce": {
            "input": `$${arraySubdocField}`,
            "initialValue": 0,
            "in": {
              "$cond": { 
                "if": {"$eq": [`$$this.${groupByKeyField}`, "$$key"]},
                "then": {"$add": [`$$this.${groupByValueField}`, "$$value"]},  
                "else": "$$value"  
              }            
            }            
          }
        }
      }
    }
  };
}
```

Define the pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Capture new fields grouping elements of each array and remove unwanted fields
  {"$set": {
    "coinTypeAwardedCounts": arrayGroupByCount("rewards", "coin"),
    "coinTypeTotals": arrayGroupBySum("rewards", "coin", "amount"),
    "_id": "$$REMOVE",
    "rewards": "$$REMOVE",
  }},
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.user_rewards.aggregate(pipeline);
```

```javascript
db.user_rewards.explain("executionStats").aggregate(pipeline);
```


## Expected Results

Three documents should be returned, representing the three gamers and showing the number of times they received each coin type and its total, as shown below:

```javascript
[
  {
    "userId": 123456789,
    "coinTypeAwardedCounts": [
      {
        "id": "bronze",
        "count": 2
      },
      {
        "id": "gold",
        "count": 3
      },
      {
        "id": "silver",
        "count": 1
      }
    ],
    "coinTypeTotals": [
      {
        "id": "bronze",
        "total": 175
      },
      {
        "id": "gold",
        "total": 85
      },
      {
        "id": "silver",
        "total": 50
      }
    ]
  },
  {
    "userId": 987654321,
    "coinTypeAwardedCounts": [
      {
        "id": "bronze",
        "count": 2
      },
      {
        "id": "silver",
        "count": 3
      }
    ],
    "coinTypeTotals": [
      {
        "id": "bronze",
        "total": 700
      },
      {
        "id": "silver",
        "total": 150
      }
    ]
  },
  {
    "userId": 888888888,
    "coinTypeAwardedCounts": [
      {
        "id": "gold",
        "count": 1
      },
      {
        "id": "platinum",
        "count": 1
      }
    ],
    "coinTypeTotals": [
      {
        "id": "gold",
        "total": 500
      },
      {
        "id": "platinum",
        "total": 5
      }
    ]
  }
]
```


## Observations

 * __Macro Functions.__ Like the prevuous example (LINK) todo.

 * __Grouping Array Elements Without Unwinding First.__ TODO. (not knowing up front what the groups are)
 
 * __TODO confusion.__ TODO use of JavaScript Template strings.

