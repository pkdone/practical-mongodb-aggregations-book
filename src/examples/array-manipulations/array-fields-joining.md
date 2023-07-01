# Array Fields Joining

__Minimum MongoDB Version:__ 4.2


## Scenario

You are developing a new dating website application using a database to hold the profiles of all registered users. For each user profile, you will persist a set of the user's specified hobbies, each with a description of how the user says they conduct their pursuit. Each user's profile also captures what they prefer to do depending on their mood (e.g., "happy", "sad", "chilling", etc.). When you show the user profiles on the website to a person searching for a date, you want to describe how each candidate user conducts their hobbies for each mood to help the person spot their ideal match.

## Sample Data Population

Drop any old version of the database (if it exists) and then populate a new user profiles collection:

```javascript
db = db.getSiblingDB("book-array-fields-joining");
db.dropDatabase();

// Insert 2 records into the users collection
db.users.insertMany([
  {
    "firstName": "Alice",
    "lastName": "Jones",
    "dateOfBirth": ISODate("1985-07-21T00:00:00Z"),
    "hobbies": {
      "music": "Playing the guitar",
      "reading": "Science Fiction books",
      "gaming": "Video games, especially RPGs",
      "sports": "Long-distance running",
      "traveling": "Visiting exotic places",
      "cooking": "Trying out new recipes",
    },      
    "moodFavourites": {
      "sad": ["music"],
      "happy": ["sports"],
      "chilling": ["music", "cooking"],
    },
  },
  {
    "firstName": "Sam",
    "lastName": "Brown",
    "dateOfBirth": ISODate("1993-12-01T00:00:00Z"),
    "hobbies": {
      "cycling": "Mountain biking",
      "writing": "Poetry and short stories",
      "knitting": "Knitting scarves and hats",
      "hiking": "Hiking in the mountains",
      "volunteering": "Helping at the local animal shelter",
      "music": "Listening to Jazz",
      "photography": "Nature photography",
      "gardening": "Growing herbs and vegetables",
      "yoga": "Practicing Hatha Yoga",
      "cinema": "Watching classic movies",
    },
    "moodFavourites": {
      "happy": ["gardening", "cycling"],
      "sad": ["knitting"],
    },
  },
]);
```


## Aggregation Pipeline

You first need to define the following function to get the array values of named fields in a sub-document where each field's name is only known at runtime:

```javascript
// Macro function to generate a complex expression to get the array values of
// named fields in a sub-document where each field's name is only known at runtime 
function getValuesOfNamedFieldsAsArray(obj, fieldnames) {
  return {
    "$map": { 
      "input": {
        "$filter": { 
          "input": {"$objectToArray": obj}, 
          "as": "currElem",
          "cond": {"$in": ["$$currElem.k", fieldnames]},
        }
      }, 
      "in": "$$this.v" 
    }, 
  };
}
```

Define the pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Set a field with activities each user likes doing according to their mood
  {"$set": {
    "moodActivities": {      
      "$arrayToObject": {
        "$map": { 
          "input": {"$objectToArray": "$moodFavourites"},
          "in": {              
            "k": "$$this.k",
            "v": getValuesOfNamedFieldsAsArray("$hobbies", "$$this.v"),
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

Two documents should be returned, each showing a new `moodActivities` array field containing descriptions of how a user conducts their preferred hobby for each mood, as shown below:

```javascript
[
  {
    firstName: 'Alice',
    lastName: 'Jones',
    dateOfBirth: ISODate("1985-07-21T00:00:00.000Z"),
    moodActivities: {
      sad: [ 'Playing the guitar' ],
      happy: [ 'Long-distance running' ],
      chilling: [ 'Playing the guitar', 'Trying out new recipes' ]
    }
  },
  {
    firstName: 'Sam',
    lastName: 'Brown',
    dateOfBirth: ISODate("1993-12-01T00:00:00.000Z"),
    moodActivities: {
      happy: [ 'Mountain biking', 'Growing herbs and vegetables' ],
      sad: [ 'Knitting scarves and hats' ]
    }
  }
]
```


## Observations

* __Reusable Macro Functions.__ As with many of the other Array Manipulation Examples, the aggregation uses a macro function to generate boilerplate code for use in the pipeline. This is a general-purpose function and reusable as-is in other solutions.

 * __Joining Between Two Fields In Each Record.__ Each user document contains two sub-document fields the pipeline must join: `hobbies` and `moodFavourites`. The `moodFavourites` sub-document properties hold arrays with values mapped to properties of the `hobbies` sub-document, and consequently, there is a many-to-many relationship between the two fields. A user's given hobby can appear as a favourite for more than one of their moods, and each user's mood can have multiple preferred hobbies. The `getValuesOfNamedFieldsAsArray()` function lets the pipeline look up multiple hobbies in one go for each 'mood' that it iterates through 
 
 * __Grouping Array Elements Without Unwinding First.__ As with the [previous example](array-element-grouping.md), the aggregation avoids unnecessarily unwinding each document's two arrays to group back together again, just to manipulate each document's array fields in isolation from other documents. It avoids introducing a blocking and resource-limited grouping step in the pipeline.

