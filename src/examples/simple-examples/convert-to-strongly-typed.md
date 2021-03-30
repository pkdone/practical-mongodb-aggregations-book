# Convert To Strongly Typed

__Minimum MongoDB Version:__ 4.2


## Scenario

A user wants to TODO.

In this example, a collection of _TODO_ documents TODO. 


## Sample Data Population

Drop the old version of the database (if it exists) and then populate a new `orders` collection with 3 orders documents, where each order has text only fields:

```javascript
use book-convert-to-strongly-typed;
db.dropDatabase();

db.orders.insertMany([
  {
    "customer_id": "elise_smith@myemail.com",
    "order_date": "2020-05-30T08:35:52",
    "value": "231.43",
    "further_info": {
      "item_qty": "3",
      "reported": "false",
    },
  },
  {
    "customer_id": "oranieri@warmmail.com",
    "order_date": "2020-01-01T08:25:37",
    "value": "63.13",
    "further_info": {
      "item_qty": "2",
      "reported": "false",
    },
  },
  {
    "customer_id": "tj@wheresmyemail.com",
    "order_date": "2019-05-28T19:13:32",
    "value": "2.01",
    "further_info": {
      "item_qty": "1",
      "reported": "true",
    },
  },  
]);
```


## Aggregation Pipeline(s)

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Convert strings to required types
  {"$set": {
    "order_date": {$toDate: "$order_date"},    
    "value": {$toDecimal: "$value"},
    "further_info.item_qty": {$toInt: "$further_info.item_qty"},
    "further_info.reported": {$toBool: "$further_info.reported"},
  }},     
  
  // Output to a new unsharded or sharded collection
  {"$merge": {
    "into": "orders_typed",
  }},    
];
```


## Execution

Execute the aggregation using the defined pipeline to generate a new collection called `orders_typed`:

```javascript
db.orders.aggregate(pipeline);
```

Check the contents of the new `orders_typed` collection to ensure the relevant fields are now appropriatly typed:

```javascript
db.orders_typed.find();
```

View the explain plan for the aggregation pipeline:

```javascript
db.orders.explain("executionStats").aggregate(pipeline);
```

## Expected Results

TODO documents should be returned TODO, as shown below:

```javascript
[
  {
    _id: ObjectId("60638b6ef844ffb26c470ba4"),
    customer_id: 'elise_smith@myemail.com',
    order_date: '2020-05-30T08:35:52',
    value: '231.43',
    further_info: { item_qty: '3', reported: 'false' }
  },
  {
    _id: ObjectId("60638b6ef844ffb26c470ba5"),
    customer_id: 'oranieri@warmmail.com',
    order_date: '2020-01-01T08:25:37',
    value: '63.13',
    further_info: { item_qty: '2', reported: 'false' }
  },
  {
    _id: ObjectId("60638b6ef844ffb26c470ba6"),
    customer_id: 'tj@wheresmyemail.com',
    order_date: '2019-05-28T19:13:32',
    value: '2.01',
    further_info: { item_qty: '1', reported: 'true' }
  }
]
```


## Observations & Comments

 * __Todo.__ Todo.
 
