# One-to-One Join

__Minimum MongoDB Version:__ 4.4 &nbsp;&nbsp; _(due to use of [$first](https://docs.mongodb.com/manual/reference/operator/aggregation/first-array-element/) array operator)_


## Scenario

A user wants to join each document in one collection to a corresponding document in another collection to produce combined summary records, where there is a 1:1 relationship between  both collections. Also, in this case, the join is based on a single field match between both sides.

In this example, a collection of _customer orders_, from shop purchases for the year 2020 only will be searched for, where each order will then be joined, by _product id_, to a matching record in the collection of _products_, to be able to include the product's name and category against each order in the results.


## Sample Data Population

Drop the old version of the database (if it exists) and then populate new `products` and `orders` collections with documents spanning 2019-2021:

```javascript
use one-to-one-join;
db.dropDatabase();

// Create index for a products collection
db.products.createIndex({'id': 1});

// Insert 4 records into the products collection
db.products.insertMany([
  {
    'id': 'a1b2c3d4',
    'name': 'Asus Laptop',
    'category': 'ELECTRONICS',
    'description': 'Good value laptop for students',
  },
  {
    'id': 'z9y8x7w6',
    'name': 'The Day Of The Triffids',
    'category': 'BOOKS',
    'description': 'Classic post-apocalyptic novel',
  },
  {
    'id': 'ff11gg22hh33',
    'name': 'Morphy Richardds Food Mixer',
    'category': 'KITCHENWARE',
    'description': 'Luxury mixer turning good cakes into great',
  },
  {
    'id': 'pqr678st',
    'name': 'Karcher Hose Set',
    'category': 'GARDEN',
    'description': 'Hose + nosels + winder for tidy storage',
  },
]); 

// Create index for a orders collection
db.orders.createIndex({'orderdate': -1});

// Insert 4 records into the orders collection
db.orders.insertMany([
  {
    'customer_id': 'elise_smith@myemail.com',
    'orderdate': ISODate('2020-05-30T08:35:52Z'),
    'product_id': 'a1b2c3d4',
    'value': NumberDecimal('431.43'),
  },
  {
    'customer_id': 'tj@wheresmyemail.com',
    'orderdate': ISODate('2019-05-28T19:13:32Z'),
    'product_id': 'z9y8x7w6',
    'value': NumberDecimal('5.01'),
  },  
  {
    'customer_id': 'oranieri@warmmail.com',
    'orderdate': ISODate('2020-01-01T08:25:37Z'),
    'product_id': 'ff11gg22hh33',
    'value': NumberDecimal('63.13'),
  },
  {
    'customer_id': 'jjones@tepidmail.com',
    'orderdate': ISODate('2020-12-26T08:55:46Z'),
    'product_id': 'a1b2c3d4',
    'value': NumberDecimal('429.65'),
  },
]);
```


## Aggregation Pipeline(s)

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Match only orders made in 2020
  {'$match': {
    'orderdate': {
      '$gte': ISODate('2020-01-01T00:00:00Z'),
      '$lt': ISODate('2021-01-01T00:00:00Z'),
    }
  }},

  // Join 'product_id' in orders collection to 'id' in products' collection
  {'$lookup': {
    'from': 'products',
    'localField': 'product_id',
    'foreignField': 'id',
    'as': 'product_mapping',
  }},

  // Should only be 1 record in right-side of join so take 1st joined array element
  {'$set': {
    'product_mapping': {'$first': '$product_mapping'},
  }},
  
  // Extract the joined embeded fields into top level fields
  {'$set': {
    'product_name': '$product_mapping.name',
    'product_category': '$product_mapping.category',
  }},
  
  // Omit unwanted fields
  {'$unset': [
    '_id',
    'product_id',
    'product_mapping',
  ]},     
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.orders.aggregate(pipeline);
```

```javascript
db.orders.explain('executionStats').aggregate(pipeline);
```


## Expected Results

Three documents should be returned, representing the three customers orders that occurred in 2020, but with each orders `product_id` field replaced by two new looked up fields, `product_name` and `product_category`, as shown below:

```javascript
[
  {
    customer_id: 'elise_smith@myemail.com',
    orderdate: 2020-05-30T08:35:52.000Z,
    value: Decimal128("431.43"),
    product_name: 'Asus Laptop',
    product_category: 'ELECTRONICS'
  },
  {
    customer_id: 'oranieri@warmmail.com',
    orderdate: 2020-01-01T08:25:37.000Z,
    value: Decimal128("63.13"),
    product_name: 'Morphy Richardds Food Mixer',
    product_category: 'KITCHENWARE'
  },
  {
    customer_id: 'jjones@tepidmail.com',
    orderdate: 2020-12-26T08:55:46.000Z,
    value: Decimal128("429.65"),
    product_name: 'Asus Laptop',
    product_category: 'ELECTRONICS'
  }
]
```


## Observations & Comments

 * __Single Field Match.__ The pipeline includes a `$lookup` join between a single field of a record in one collection and a single field of a record in another collection. For an illustration of performing a join based on 2 or more matching fields in the lookup, see the example [Multi-Field Join & One-to-Many](../moderate-examples/multi-one-to-many.html)
 
 * __First Element Assumption.__ The pipeline assumes that the relationship between the two collections is 1:1 and so for the returned array of joined elements following the `$lookup` stage, the pipeline assumes the number of elements in the array is exactly one (and not more). As a result the pipeline then just extracts the date from this first array element only, using the `$first` operator. For an illustration of performing a 1:many join, see the example [Multi-Field Join & One-to-Many](../moderate-examples/multi-one-to-many.html)

