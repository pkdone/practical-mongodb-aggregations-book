# Group & Total

__Minimum MongoDB Version:__ 4.2


## Scenario

You want to generate a report to show what each shop customer purchased in 2020. You will group the individual order records by customer, capturing each customer's first purchase date, the number of orders they made, the total value of all their orders and a list of their order items sorted by date. 


## Sample Data Population

Drop any old version of the database (if it exists) and then populate a new `orders` collection with 9 order documents spanning 2019-2021, for 3 different unique customers:

```javascript
use book-group-and-total;
db.dropDatabase();

// Create index for an orders collection
db.orders.createIndex({"orderdate": -1});

// Insert records into the orders collection
db.orders.insertMany([
  {
    "customer_id": "elise_smith@myemail.com",
    "orderdate": ISODate("2020-05-30T08:35:52Z"),
    "value": NumberDecimal("231.43"),
  },
  {
    "customer_id": "elise_smith@myemail.com",
    "orderdate": ISODate("2020-01-13T09:32:07Z"),
    "value": NumberDecimal("99.99"),
  },
  {
    "customer_id": "oranieri@warmmail.com",
    "orderdate": ISODate("2020-01-01T08:25:37Z"),
    "value": NumberDecimal("63.13"),
  },
  {
    "customer_id": "tj@wheresmyemail.com",
    "orderdate": ISODate("2019-05-28T19:13:32Z"),
    "value": NumberDecimal("2.01"),
  },  
  {
    "customer_id": "tj@wheresmyemail.com",
    "orderdate": ISODate("2020-11-23T22:56:53Z"),
    "value": NumberDecimal("187.99"),
  },
  {
    "customer_id": "tj@wheresmyemail.com",
    "orderdate": ISODate("2020-08-18T23:04:48Z"),
    "value": NumberDecimal("4.59"),
  },
  {
    "customer_id": "elise_smith@myemail.com",
    "orderdate": ISODate("2020-12-26T08:55:46Z"),
    "value": NumberDecimal("48.50"),
  },
  {
    "customer_id": "tj@wheresmyemail.com",
    "orderdate": ISODate("2021-02-29T07:49:32Z"),
    "value": NumberDecimal("1024.89"),
  },
  {
    "customer_id": "elise_smith@myemail.com",
    "orderdate": ISODate("2020-10-03T13:49:44Z"),
    "value": NumberDecimal("102.24"),
  },
]);
```


## Aggregation Pipeline

Define a pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Match only orders made in 2020
  {"$match": {
    "orderdate": {
      "$gte": ISODate("2020-01-01T00:00:00Z"),
      "$lt": ISODate("2021-01-01T00:00:00Z"),
    },
  }},
  
  // Sort by order date ascending (required to pick out 'first_purchase_date' below)
  {"$sort": {
    "orderdate": 1,
  }},      

  // Group by customer
  {"$group": {
    "_id": "$customer_id",
    "first_purchase_date": {"$first": "$orderdate"},
    "total_value": {"$sum": "$value"},
    "total_orders": {"$sum": 1},
    "orders": {"$push": {"orderdate": "$orderdate", "value": "$value"}},
  }},
  
  // Sort by each customer's first purchase date
  {"$sort": {
    "first_purchase_date": 1,
  }},    
  
  // Set customer's ID to be value of the field that was grouped on
  {"$set": {
    "customer_id": "$_id",
  }},
  
  // Omit unwanted fields
  {"$unset": [
    "_id",
  ]},   
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.orders.aggregate(pipeline);
```

```javascript
db.orders.explain("executionStats").aggregate(pipeline);
```


## Expected Results

Three documents should be returned, representing the three customers, each showing the customer's first purchase date, the total value of all their orders, the number of orders they made and a list of each order's detail, for 2020 only, as shown below:

```javascript
[
  {
    customer_id: 'oranieri@warmmail.com',
    first_purchase_date: ISODate('2020-01-01T08:25:37.000Z'),
    total_value: NumberDecimal('63.13'),
    total_orders: 1,
    orders: [
      {orderdate: ISODate('2020-01-01T08:25:37.000Z'), value: NumberDecimal('63.13')}
    ]
  },
  {
    customer_id: 'elise_smith@myemail.com',
    first_purchase_date: ISODate('2020-01-13T09:32:07.000Z'),
    total_value: NumberDecimal('482.16'),
    total_orders: 4,
    orders: [
      {orderdate: ISODate('2020-01-13T09:32:07.000Z'), value: NumberDecimal('99.99')},
      {orderdate: ISODate('2020-05-30T08:35:52.000Z'), value: NumberDecimal('231.43')},
      {orderdate: ISODate('2020-10-03T13:49:44.000Z'), value: NumberDecimal('102.24')},
      {orderdate: ISODate('2020-12-26T08:55:46.000Z'), value: NumberDecimal('48.50')}
    ]
  },
  {
    customer_id: 'tj@wheresmyemail.com',
    first_purchase_date: ISODate('2020-08-18T23:04:48.000Z'),
    total_value: NumberDecimal('192.58'),
    total_orders: 2,
    orders: [
      {orderdate: ISODate('2020-08-18T23:04:48.000Z'), value: NumberDecimal('4.59')},
      {orderdate: ISODate('2020-11-23T22:56:53.000Z'), value: NumberDecimal('187.99')}
    ]
  }
]
```

_Note, the order of fields shown for each document may vary._


## Observations

 * __Double Sort Use.__ It is necessary to perform a `$sort` on the order date both before and after the `$group` stage. The `$sort` before the `$group` is required because the `$group` stage uses a `$first` group accumulator to capture just the first order's `orderdate` value for each grouped customer. The `$sort` after the `$group` is required because the act of having just grouped on customer ID will mean that the records are no longer sorted by purchase date for the records coming out of the `$group` stage.
 
 * __Renaming Group.__ Towards the end of the pipeline, you will see what is a typical pattern for pipelines that use `$group`, consisting of a combination of `$set`+`$unset` stages, to essentially take the group's key (which is always called `_id`) and substitute it with a more meaningful name (`customer_id`).
 
 * __High-Precision Decimals__. You may notice the pipeline uses a `NumberDecimal()` function to ensure the order amounts in the inserted records are using a high-precision decimal type, [IEEE 754 decimal128](https://docs.mongodb.com/manual/tutorial/model-monetary-data/). In this example, if you use a JSON _float_ or _double_ type instead, the order totals will significantly lose precision. For instance, for the customer `elise_smith@myemail.com`, if you use a _double_ type, the `total_value` result will have the value shown in the second line below, rather than the first line:
 
     ```javascript
     // Desired result achieved by using decimal128 types
     total_value: NumberDecimal('482.16')
     
     // Result that occurs if using float or double types instead
     total_value: 482.15999999999997
     ```

