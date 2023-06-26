# Role Programmatic Restricted View

__Minimum MongoDB Version:__ 7.0 &nbsp;&nbsp; _(due to use of `USER_ROLES` system variable)_


## Scenario

TODO.

> _Essentially, this example illustrates applying "field-level" access control in MongoDB. It applies programmatic role-based access control rules rather than declarative ones to enforce what data users can access within a view. Additionally, in a real-world situation, you would use a declarative role to limit the client application only to have access to the view and not the underlying collection._


## Sample Data Population

If you are using a self-installed MongoDB deployment, run the following commands to create the necessary roles and users to help with implementing programmatic access control:

> _If you are using a [MongoDB Atlas Database Cluster](https://www.mongodb.com/atlas/database), then instead, use the [Atlas console](https://cloud.mongodb.com/) to define the roles and users for your Atlas project and its database cluster._

```javascript
var dbName = "book-role-programmatic-restricted-view";
db = db.getSiblingDB(dbName);
db.dropDatabase();
db.dropAllRoles();
db.dropAllUsers();

// Create 3 roles to use for programmatic access control
db.createRole({"role": "Doctor", "roles": [], "privileges": []});
db.createRole({"role": "Nurse", "roles": [], "privileges": []});
db.createRole({"role": "Receptionist", "roles": [], "privileges": []});


// Create 3 users where each user will have a different role
db.createUser({
  "user": "Mandy",
  "pwd": "abc123",
  "roles": [
     {"role": "Doctor", "db": dbName},
  ]
});
db.createUser({
  "user": "Carl",
  "pwd": "xyz789",
  "roles": [
    {"role": "Nurse", "db": dbName},
  ]
});
db.createUser({
  "user": "Sam",
  "pwd": "mno456",
  "roles": [
    {"role": "Receptionist", "db": dbName},
  ]
});
```

Drop any old version of the database (if it exists), create an index and populate the new `patients` collections with 4 records:

```javascript
// Insert 4 records into the patients collection
db.patients.insertMany([
  {
    "id": "D40230",
    "first_name": "Chelsea",
    "last_Name": "Chow",
    "birth_date": ISODate("1984-11-07T10:12:00Z"),
    "weight": 145,
    "medication": ["Insulin", "Methotrexate"],
  },
  {
    "id": "R83165",
    "first_name": "Pharrell",
    "last_Name": "Phillips",
    "birth_date": ISODate("1993-05-30T19:44:00Z"),
    "weight": 137,
    "medication": ["Fluoxetine"],
  },  
  {
    "id": "X24046",
    "first_name": "Billy",
    "last_Name": "Boaty",
    "birth_date": ISODate("1976-02-07T23:58:00Z"),
    "weight": 223,
    "medication": [],
  },
  {
    "id": "P53212",
    "first_name": "Yazz",
    "last_Name": "Yodeler",
    "birth_date": ISODate("1999-12-25T12:51:00Z"),
    "weight": 156,
    "medication": ["Tylenol", "Naproxen"],
  }, 
]);
```


## Aggregation Pipeline

Define an aggregation pipeline ready to be used as the basis for a new view:

```javascript
var pipeline = [
  {"$set": {
    // Exclude weight if user does not have right role
    "weight": {
      "$cond": {
        "if": {
          "$eq": [{"$setIntersection": ["$$USER_ROLES.role", ["Doctor", "Nurse"]]}, []]
        },
        then: '$$REMOVE',
        else: '$weight'
      }
    },
      
    // Exclude weight if user does not have right role
    "medication": {
      "$cond": {
        "if": {
          "$eq": [{"$setIntersection": ["$$USER_ROLES.role", ["Doctor"]]}, []]
        },
        then: '$$REMOVE',
        else: '$medication'
      }
    },

    // Always exclude _id
    "_id": "$$REMOVE",
  }},
]
```

Create a new view called `patients_view`, which will automatically apply the aggregation pipeline whenever anyone queries the view: 

```javascript
db.createView("patients_view", "patients", pipeline);
```

## Execution

Authenticate as **Sam**, who has the **Receptionist** role, and execute a simple query against the view to observe which fields of each record Sam can see:

```javascript
db.auth("Sam", "mno456");

db.patients_view.find();
```

Authenticate as **Carl**, who has the **Nurse** role, and execute a simple query against the view to observe which fields of each record Carl can see:

```javascript
db.auth("Carl", "xyz789");

db.patients_view.find();
```

Authenticate as **Mandy**, who has the **Doctor** role, and execute a simple query against the view to observe which fields of each record Mandy can see:

```javascript
db.auth("Mandy", "abc123");

db.patients_view.find();
```

For completeness, also view the explain plan for the aggregation pipeline:

```javascript
db.patients_view.explain("executionStats").find();
```


## Expected Results

Running `find()` on the view for  **Sam** (**Receptionist**) includes patient data in the results but missing each patient's weight and medication fields because the user's role does not have sufficient privileges to access those fields via the view. 

```javascript
[
  {
    id: 'D40230',
    first_name: 'Chelsea',
    last_Name: 'Chow',
    birth_date: ISODate("1984-11-07T10:12:00.000Z")
  },
  {
    id: 'R83165',
    first_name: 'Pharrell',
    last_Name: 'Phillips',
    birth_date: ISODate("1993-05-30T19:44:00.000Z")
  },
  {
    id: 'X24046',
    first_name: 'Billy',
    last_Name: 'Boaty',
    birth_date: ISODate("1976-02-07T23:58:00.000Z")
  },
  {
    id: 'P53212',
    first_name: 'Yazz',
    last_Name: 'Yodeler',
    birth_date: ISODate("1999-12-25T12:51:00.000Z")
  }
]
```

Running `find()` on the view for  **Carl** (**Nurse**) includes patient data in the results similar to the previous user, but with the **weight** field also shown for each record.

```javascript
[
  {
    id: 'D40230',
    first_name: 'Chelsea',
    last_Name: 'Chow',
    birth_date: ISODate("1984-11-07T10:12:00.000Z"),
    weight: 145
  },
  {
    id: 'R83165',
    first_name: 'Pharrell',
    last_Name: 'Phillips',
    birth_date: ISODate("1993-05-30T19:44:00.000Z"),
    weight: 137
  },
  {
    id: 'X24046',
    first_name: 'Billy',
    last_Name: 'Boaty',
    birth_date: ISODate("1976-02-07T23:58:00.000Z"),
    weight: 223
  },
  {
    id: 'P53212',
    first_name: 'Yazz',
    last_Name: 'Yodeler',
    birth_date: ISODate("1999-12-25T12:51:00.000Z"),
    weight: 156
  }
]
```

Running `find()` on the view for  **Mandy** (**Doctor**) includes each patient's entire data in the results, including the **weight** and **medication** fields, due to the user having sufficient privileges to access those fields via the view. 

```javascript
[
  {
    id: 'D40230',
    first_name: 'Chelsea',
    last_Name: 'Chow',
    birth_date: ISODate("1984-11-07T10:12:00.000Z"),
    weight: 145,
    medication: [ 'Insulin', 'Methotrexate' ]
  },
  {
    id: 'R83165',
    first_name: 'Pharrell',
    last_Name: 'Phillips',
    birth_date: ISODate("1993-05-30T19:44:00.000Z"),
    weight: 137,
    medication: [ 'Fluoxetine' ]
  },
  {
    id: 'X24046',
    first_name: 'Billy',
    last_Name: 'Boaty',
    birth_date: ISODate("1976-02-07T23:58:00.000Z"),
    weight: 223,
    medication: []
  },
  {
    id: 'P53212',
    first_name: 'Yazz',
    last_Name: 'Yodeler',
    birth_date: ISODate("1999-12-25T12:51:00.000Z"),
    weight: 156,
    medication: [ 'Tylenol', 'Naproxen' ]
  }
]
```


## Observations

 * __TODO.__ Todo.

// TODO: declarative vs programmatic access control (also allows field level access control for queries)
// TODO: See redact for how can use find() with filter or aggregate with $match on the view
// TODO: could do $lookup to a business rules collection rather than hard code the logic in agg pipeline
// TODO: could create a different view for each, but if many roles no need to here

