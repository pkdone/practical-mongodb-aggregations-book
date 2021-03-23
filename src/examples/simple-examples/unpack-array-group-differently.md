# Unpack Arrays & Group Differently

__Minimum MongoDB Version:__ 4.2


## Scenario

A user wants to scan through a collection, where each record contains an array of sub-documents, unpacking these array elements as new individual records and then grouping these unpacked records by a common attribute, providing totals and counts.

In this example, a collection of _customer orders_, from shop purchases for the year 2020 only will be searched for. The one or more orders occurring for each customer will be unpacked into separate order records and then these resulting records will be grouped by product type (e.g. _ELECTRONICS_, _BOOKS_) with a total value and count of all orders for each of these product types. Essentially what is produced is a report of how many shop orders were made for each product in 2020.


## Sample Data Population

Drop the old version of the database (if it exists) and then populate a new `customer_orders` collection with customer related documents spanning 2019-2021, with each customer having an array of 1 or more orders:

```javascript
use unpack-array-group-differently;
db.dropDatabase();

// Insert 3 records into the customer_orders collection each with 1+ orders
db.customer_orders.insertMany([
  {
    'customer_id': 'tj@wheresmyemail.com',
    'orders': [
      {
        'orderdate': ISODate('2019-05-28T19:13:32Z'),
        'product_type': 'STATIONARY',
        'value': NumberDecimal('2.01'),
      },
      {
        'orderdate': ISODate('2020-08-18T23:04:48Z'),
        'product_type': 'BOOKS',
        'value': NumberDecimal('4.59'),
      },
      {
        'orderdate': ISODate('2020-11-23T22:56:53Z'),
        'product_type': 'ELECTRONICS',
        'value': NumberDecimal('187.99'),
      },
      {
        'orderdate': ISODate('2021-03-01T07:49:32Z'),
        'product_type': 'ELECTRONICS',
        'value': NumberDecimal('1024.89'),
      },
    ],
  },
  {
    'customer_id': 'oranieri@warmmail.com',
    'orders': [
      {
        'orderdate': ISODate('2020-01-01T08:25:37Z'),
        'product_type': 'GARDEN',
        'value': NumberDecimal('63.13'),
      },
    ],
  },
  {
    'customer_id': 'elise_smith@myemail.com',
    'orders': [
      {
        'orderdate': ISODate('2020-01-13T09:32:07Z'),
        'product_type': 'GARDEN',
        'value': NumberDecimal('99.99'),
      },
      {
        'orderdate': ISODate('2020-05-30T08:35:52Z'),
        'product_type': 'ELECTRONICS',
        'value': NumberDecimal('231.43'),
      },
      {
        'orderdate': ISODate('2020-10-03T13:49:44Z'),
        'product_type': 'GARDEN',
        'value': NumberDecimal('102.24'),
      },
      {
        'orderdate': ISODate('2020-12-26T08:55:46Z'),
        'product_type': 'KITCHENWARE',
        'value': NumberDecimal('48.50'),
      },
    ],
  },
]);
```


## Aggregation Pipeline(s)

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Unpack each order from the customer orders array as a new separate record
  {'$unwind': {
    'path': '$orders',
  }},

  // Match only orders made in 2020
  {'$match': {
    'orders.orderdate': {
      '$gte': ISODate('2020-01-01T00:00:00Z'),
      '$lt': ISODate('2021-01-01T00:00:00Z'),
    }
  }},
  
  // Group by product type
  {'$group': {
    '_id': '$orders.product_type',
    'total_value': {'$sum': '$orders.value'},
    'total_orders': {'$sum': 1},
  }},
  
  // Set product type to be the value of the field that was grouped on
  {'$set': {
    'product_type': '$_id',
  }},
  
  // Omit unwanted field
  {'$unset': [
    '_id',
  ]},   
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.customer_orders.aggregate(pipeline);
```

```javascript
db.customer_orders.explain('executionStats').aggregate(pipeline);
```


## Expected Results

Four documents should be returned, representing the four products that kept reoccurring in the customer orders arrays, each showing the product's total order value and orders count, for orders placed in 2020 only, as shown below:

```javascript
[
  {
    product_type: 'KITCHENWARE',
    total_value: Decimal128("48.50"),
    total_orders: 1,
  },
  {
    product_type: 'ELECTRONICS',
    total_value: Decimal128("419.42"),
    total_orders: 2,
  },
  {
    product_type: 'GARDEN',
    total_value: Decimal128("265.36"),
    total_orders: 3,
  },
  {
    product_type: 'BOOKS',
    total_value: Decimal128("4.59"),
    total_orders: 1,
  },
]
```


## Observations & Comments

 * __Unwinding Arrays.__ The `$unwind` stage is a powerful but often initially unfamiliar concept to many developers. Distilled down, it does one simple thing: it generates a new record for each element in an array field for every input document. If the input collection has 3 records, and each record has an array field containing 4 elements, then performing an `$unwind` on the array fields will result in 12 output records (3 x 4).

