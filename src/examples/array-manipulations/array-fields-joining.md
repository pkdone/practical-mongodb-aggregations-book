# Array Fields Joining

__Minimum MongoDB Version:__ 4.2


## Scenario

You are developing a new dating website application using a database to hold the profiles of all registered users. For each user profile, you will persist a list of the user's specified hobbies, each with a description of how the user says they conduct the hobby. Each user profile also captures what the user prefers to do depending on their mood (e.g., "happy", "sad", or "chilling"). When you show the user profiles on the website to a person searching for a date, you want to show each candidate profile's description of how the candidate conducts their hobby for each mood, to help the person spot their ideal match.

## Sample Data Population

Drop any old version of the database (if it exists) and then populate a new user profiles collection:

```javascript
use book-array-fields-joining;
db.dropDatabase();

// Insert 2 records into the users collection
db.users.insertMany([
  {
    "firstName": "Alice",
    "lastName": "Jones",
    "dateOfBirth": ISODate("1985-07-21T00:00:00Z"),
    "hobbies": [
      {"music": "Playing the guitar"},
      {"reading": "Science Fiction books"},
      {"gaming": "Video games, especially RPGs"},
      {"sports": "Long-distance running"},
      {"traveling": "Visiting exotic places"},
      {"cooking": "Trying out new recipes"},
    ],      
    "moodFavourites": [
      {"sad": "music"},
      {"happy": "sports"},
      {"chilling": "music"},
    ],
  },
  {
    "firstName": "Sam",
    "lastName": "Brown",
    "dateOfBirth": ISODate("1993-12-01T00:00:00Z"),
    "hobbies": [
      {"cycling": "Mountain biking"},
      {"writing": "Poetry and short stories"},
      {"knitting": "Knitting scarves and hats"},
      {"hiking": "Hiking in the mountains"},
      {"volunteering": "Helping at the local animal shelter"},
      {"music": "Listening to Jazz"},
      {"photography": "Nature photography"},
      {"gardening": "Growing herbs and vegetables"},
      {"yoga": "Practicing Hatha Yoga"},
      {"cinema": "Watching classic movies"},
    ],
    "moodFavourites": [
      {"happy": "gardening"},
      {"sad": "knitting"},
    ],
  },
]);
```


## Aggregation Pipeline

You first need to define the following function to get the value with a matching key for an array of key-value pair objects:

```javascript
// Macro function to generate a complex expression to get the value with
// a matching key for an array of key-value pair objects
function getValueOfMatchingArrayElementByKey(array, key) {
  return {
    "$getField": {
      "input": {
        "$first": {
          "$objectToArray": {
            "$first": [ 
              {"$filter": { 
                "input": array, 
                "as": "currElem",
                "cond": {
                  "$eq": [
                    {"$getField": {
                      "input": {"$first": {"$objectToArray": "$$currElem"}},
                      "field": "k"}
                    }, 
                    key
                  ]
                },
                "limit": 1
              }}
            ]        
          }
        }
      },
      "field": "v"
    }
  }
}
```

Define the pipeline ready to perform the aggregation:

```javascript
const pipeline = [
  // Set a field with activities each user likes doing according to their mood
  {"$set": {
    "moodActivities": {      
      "$arrayToObject": {
        "$map": { 
          "input": {        
            "$map": { 
              "input": "$moodFavourites",
              "in": {"$first": {"$objectToArray": "$$this"}},
            }, 
          },
          "in": {              
            "k": "$$this.k",
            "v": getValueOfMatchingArrayElementByKey("$hobbies", "$$this.v"),
          }
        }, 
      }
    }
  }},

  // Remove unwanted fields  
  {"$unset": [
    "_id",
    "hobbies",
    "moodFavourites",
  ]},  
]
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.users.aggregate(pipeline);
```

```javascript
db.users.explain().aggregate(pipeline);
```


## Expected Results

Two documents should be returned, each showing a new `moodActivities` array field containing descriptions of how a user conducts their preferred hobby for each mood, as shown below::

```javascript
[
  {
    firstName: 'Alice',
    lastName: 'Jones',
    dateOfBirth: ISODate("1985-07-21T00:00:00.000Z"),
    moodActivities: {
      sad: 'Playing the guitar',
      happy: 'Long-distance running',
      chilling: 'Playing the guitar'
    }
  },
  {
    firstName: 'Sam',
    lastName: 'Brown',
    dateOfBirth: ISODate("1993-12-01T00:00:00.000Z"),
    moodActivities: {
      happy: 'Growing herbs and vegetables',
      sad: 'Knitting scarves and hats'
    }
  }
]
```


## Observations

* __Reusable Macro Functions.__ As with many of the other Array Manipulation Examples, the aggregation uses a macro function to generate boilerplate code for use in the pipeline. This is a general-purpose function and reusable as-is in other solutions.

 * __Joining Between Two Fields In Each Record.__ Each user document has two array fields, the first called `hobbies` and the second called `moodFavourites`, and both these arrays hold key-value pairs. Essentially, the aggregation is joining the values from the `moodFavourites` array with the keys from the `hobbies` array and then outputting the keys from the 'moodFavourites' array paired with matching values of the `hobbies` array. The names of the new keys in the key-value pairs of the array field the aggregation is joining to are not known ahead of time. Therefore, the new `getValueOfMatchingArrayElementByKey()` macro function performs some 'gymnastics'. The macro uses `$objectToArray` in two places. It has to look up all the keys by the name 'k' to match just one, and it has to look up the values by the name 'v' to extract just one. The main pipeline then uses `$arrayToObject` to bring each new key ('k') and its new matching value ('v') back together again, with their proper titles (e.g. 'happy': 'Long-distance running').
 
 * __Grouping Array Elements Without Unwinding First.__ As with the [previous example](array-element-grouping.md), the aggregation avoids unnecessarily unwinding each document's two arrays to group back together again, just to manipulate each document's array fields in isolation from other documents. It avoids introducing a blocking and resource-limited grouping step in the pipeline.
 
