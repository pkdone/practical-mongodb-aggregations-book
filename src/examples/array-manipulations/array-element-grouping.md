# Array Element Grouping

__Minimum MongoDB Version:__ 4.2


## Scenario

You want to provide a report for your online game showing the total "coin" rewards each gaming user has accumulated. The challenge is that the source collection captures each time the game awards a user with a type of coin in a growing array field containing many elements. However,  for each gamer, you want to show totals for each coin type in an array instead. An extra complication exists in that you don't know ahead of time what all the possible coin types can be when developing the solution. For example, the game could introduce different coin types in the future (e.g. "tungsten coins").

## Sample Data Population

Drop any old version of the database (if it exists) and then populate the user rewards collection:

```javascript
db = db.getSiblingDB("book-array-element-grouping");
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
    userId: 123456789,
    coinTypeAwardedCounts: [ 
      { id: 'bronze', count: 2 },
      { id: 'silver', count: 1 },
      { id: 'gold', count: 3 }
    ],
    coinTypeTotals: [
      { id: 'bronze', total: 175 },
      { id: 'silver', total: 50 },
      { id: 'gold', total: 85 }
    ]
  },
  {
    userId: 987654321,
    coinTypeAwardedCounts: [
      { id: 'bronze', count: 2 },
      { id: 'silver', count: 3 }
    ],
    coinTypeTotals: [
      { id: 'bronze', total: 700 },
      { id: 'silver', total: 150 }
    ]
  },
  {
    userId: 888888888,
    coinTypeAwardedCounts: [
      { id: 'gold', count: 1 },
      { id: 'platinum', count: 1 }
    ],
    coinTypeTotals: [
      { id: 'gold', total: 500 },
      { id: 'platinum', total: 5 }
    ]
  }
]
```


## Observations

 * __Reusable Macro Functions.__ As with the [previous example](array-sort-percentiles.md), the aggregation uses macro functions to generate boilerplate code, which it inlines into the pipeline before the aggregation runtime executes it. In this example, both the `arrayGroupByCount()` and `arrayGroupBySum()` macro functions are general-purpose and reusable, which you can employ as-is for any other scenario where array elements need to be grouped and totalled.

 * __Grouping Array Elements Without Unwinding First.__ The `$group` stage is the standard tool for grouping elements and producing counts and totals for these groups. However, as discussed in the
[optimising for performance](../../guides/performance.md#2-avoid-unwinding--regrouping-documents-just-to-process-array-elements) chapter, if you only need to manipulate each document's array field in isolation from other documents, this is inefficient. You must unwind a document's array, process the unpacked data and then regroup each array back into the same parent document. By regrouping, you are introducing a blocking and resource-limited step. This example's two macro functions enable you to avoid this overhead and achieve the array grouping you require, even when the keys you are grouping by are unknown to you ahead of time. The `$setUnion` operator used in both functions produces the set of unique keys to group by.
 
 * __Variable Reference And `$$` Potential Confusion.__ You may recall in the [Expressions Explained chapter](../../guides/expressions.md) that for aggregation expressions, field paths begin with `$` (e.g. `$rewards`) and variables begin with `$$` (e.g. `$$currentItem`). Therefore you may be confused by the syntax `` `$${arraySubdocField}` `` used in both functions. This confusion is understandable. Employing `` ` `` backticks is part of the [Template Literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) feature of JavaScript. Therefore, before the pipeline executes, the JavaScript interpreter replaces `${arraySubdocField}` with the string `rewards`, which is the value of the `arraySubdocField` parameter passed to the function. So `` `$${arraySubdocField}` `` becomes the field path `"$rewards"` before the macro function embeds it into the larger complex expression it is constructing.

