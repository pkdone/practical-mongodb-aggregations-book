# Role Programmatic Restricted View

__Minimum MongoDB Version:__ 7.0 &nbsp;&nbsp; _(due to use of `USER_ROLES` system variable)_


## Scenario

At a medical establishment, the central IT system holds patient data that you need to surface to different applications (and their users) according to the application's role: Receptionist, Nurse, and Doctor. Consequently, you will provide a read-only view of patient data, but the view will filter out specific sensitive fields depending on the viewer application's role. For example, the Receptionist's application should not be able to display the patient's current weight and medication. However, the Doctor's application needs this information to enable them to perform their job.

> _Essentially, this example illustrates applying "field-level" access control in MongoDB. It applies programmatic role-based access control rules rather than declarative ones to enforce what data users can access within a view. Additionally, in a real-world situation, you would use a declarative role to limit the client application to only have access to the view and not the underlying collection._


## Sample Data Population

If you are using a self-installed MongoDB deployment, run the following commands to drop any old version of the database (if it exists) and create the necessary roles and users to help with implementing programmatic access control:

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
  "user": "front-desk",
  "pwd": "abc123",
  "roles": [
     {"role": "Doctor", "db": dbName},
  ]
});
db.createUser({
  "user": "nurse-station",
  "pwd": "xyz789",
  "roles": [
    {"role": "Nurse", "db": dbName},
  ]
});
db.createUser({
  "user": "exam-room",
  "pwd": "mno456",
  "roles": [
    {"role": "Receptionist", "db": dbName},
  ]
});
```

Populate the new `patients` collection with 4 records:

```javascript
db = db.getSiblingDB("book-role-programmatic-restricted-view");

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

Define an aggregation pipeline ready to be used as the basis of a new view:

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

Authenticate as **front-desk**, which has the **Receptionist** role, and execute a simple query against the view to observe which fields of each record the application can see:

```javascript
db.auth("front-desk", "mno456");

db.patients_view.find();
```

Authenticate as **nurse-station**, which has the **Nurse** role, and execute a simple query against the view to observe which fields of each record the application can see:

```javascript
db.auth("nurse-station", "xyz789");

db.patients_view.find();
```

Authenticate as **exam-room**, which has the **Doctor** role, and execute a simple query against the view to observe which fields of each record the application can see:

```javascript
db.auth("exam-room", "abc123");

db.patients_view.find();
```

For completeness, also view the explain plan for the aggregation pipeline:

```javascript
db.patients_view.explain("executionStats").find();
```


## Expected Results

Running a query on the view for the **front-desk** (**Receptionist**) includes patient data in the results but omits each patient's weight and medication fields because the user's role does not have sufficient privileges to access those fields via the view. 

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

Running a query on the view for the **nurse-station** (**Nurse**) includes patient data in the results similar to the previous user, but with the **weight** field also shown for each record.

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

Running a query on the view for  **exam-room** (**Doctor**) includes each patient's entire data in the results, including the **weight** and **medication** fields, due to the user having sufficient privileges to access those fields via the view. 

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

 * __Programmatic Vs Declarative Role-Based Access Control (RBAC).__ MongoDB provides a [Role-Based Access Control](https://www.mongodb.com/docs/manual/core/authorization/) (RBAC) to enable an administrator to govern access to database resources by declaratively granting system users to one or more roles (e.g. `readWrite`, `find`) against one or more resources (e.g. `collectionABC`, `viewXYZ`). However, the example chapter goes further by allowing you to include business logic to enforce programmatic access rules based on the connecting system user's role. In the example shown, these "rules" are captured in Aggregation expressions which use the `$$USER_ROLES` system variable to look up the roles associated with the current requesting system user. In this case, the logic for both `weight` and `medication` uses a condition expression (`$cond`) to see if the connected user is a member of a specific named role, and if not, it removes the field. The entire set of MongoDB Aggregation operators allows you to implement the custom logic for whatever programmatic access controls you like.
 
 * __Avoids Proliferation Of Views.__ For this scenario, there is an alternative solution that would rely on purely declarative RBAC rather than introducing the need for programmatic rules, achieved by defining three different "hard-coded" views. There would be one view per role (e.g. `receptionist_patients_view`, `nurse_patients_view`, `doctor_patients_view`). Each view would contain an almost identical aggregation pipeline, varying only in the specific fields they omit. Such an approach introduces redundancy; whenever a developer changes the view's core aggregation pipeline changes, they need to make the changes in three places. This proliferation of views would be exasperated when there are 100s of roles involved in a typical non-trivial application. A programmatic RBAC approach can reduce maintenance costs and friction, impeding change.

 * __Filter On View With Index Pushdowns.__ It is not shown here, but as with the [redacted view example](redacted-view.md), the view's aggregation pipeline can leverage an appropriate index, including the ability, in certain circumstances, to push down the filters passed to the `find()` operation run against the view. 

 * __Potential To Factor Out Logic To Dynamic Metadata.__ This chapter's example uses "hard-coded" logic to enforce access control rules. Every time the business needs a rile to be changed (e.g. what fields Nurse can see), a developer must modify and re-test the code. When such business rules change frequently in dynamic applications, it may be undesirable to mandate a code change and application re-release each time an access control rule changes. Instead, you could factor out metadata to a new collection capturing the mappings of the names of the fields each role can access. A business administrator could dynamically modify these mappings via an administrative user interface. The aggregation pipeline for a view would then use the `$lookup` stage to map the current connect user's role (using `USER_ROLES`) as the filter to the collection being lookup up and then use the list of fields from the `$lookup` operation in the rest of the pipeline to show each field conditionally. 
 

