# Multi-Field Join & One-to-Many

__Minimum MongoDB Version:__ 4.2


## Scenario

A user wants to join each document in a 'left-side' collection to zero or more corresponding documents in a 'right-side' collection, where the joined 'right-side' documents are embedded in a array field of the 'left-side' document. Additionally, for this scenario, the join is based on compound fields (two fields on the left-side matching to two fields on the right-side of the join).

In this example, a collection of _shop products_ is joined to a collection of _orders_ to enable the results to show each product containing a list its orders made in 2020. In this case, rather than there being a single field on each side to join (e.g. `product_id`), there are two corresponding fields on each side of the join that have to be matched (`product_name` and `product_variation`).

Note, the requirement to perform a 1:many join does not of course mandate the need to join by multiple fields on each side of the join. However, in this example, it has been deemed useful to show both of these aspects in one place.


## Sample Data Population

Drop the old version of the database (if it exists) and then populate new `products` and `orders` collections with documents spanning 2019-2021:

```javascript
use multi-one-to-many;
db.dropDatabase();

// Insert 6 records into the products collection
db.products.insertMany([
  {
    'name': 'Asus Laptop',
    'variation': 'Ultra HD',
    'category': 'ELECTRONICS',
    'description': 'Great for watching movies',
  },
  {
    'name': 'Asus Laptop',
    'variation': 'Normal Display',
    'category': 'ELECTRONICS',
    'description': 'Good value laptop for students',
  },
  {
    'name': 'The Day Of The Triffids',
    'variation': '1st Edition',
    'category': 'BOOKS',
    'description': 'Classic post-apocalyptic novel',
  },
  {
    'name': 'The Day Of The Triffids',
    'variation': '2nd Edition',
    'category': 'BOOKS',
    'description': 'Classic post-apocalyptic novel',
  },
  {
    'name': 'Morphy Richards Food Mixer',
    'variation': 'Deluxe',
    'category': 'KITCHENWARE',
    'description': 'Luxury mixer turning good cakes into great',
  },
  {
    'name': 'Karcher Hose Set',
    'variation': 'Full Monty',
    'category': 'GARDEN',
    'description': 'Hose + nosels + winder for tidy storage',
  },
]); 

// Create index for a orders collection
db.orders.createIndex({'product_name': 1, 'product_variation': 1});

// Insert 4 records into the orders collection
db.orders.insertMany([
  {
    'customer_id': 'elise_smith@myemail.com',
    'orderdate': ISODate('2020-05-30T08:35:52Z'),
    'product_name': 'Asus Laptop',
    'product_variation': 'Normal Display',
    'value': NumberDecimal('431.43'),
  },
  {
    'customer_id': 'tj@wheresmyemail.com',
    'orderdate': ISODate('2019-05-28T19:13:32Z'),
    'product_name': 'The Day Of The Triffids',
    'product_variation': '2nd Edition',
    'value': NumberDecimal('5.01'),
  },  
  {
    'customer_id': 'oranieri@warmmail.com',
    'orderdate': ISODate('2020-01-01T08:25:37Z'),
    'product_name': 'Morphy Richards Food Mixer',
    'product_variation': 'Deluxe',
    'value': NumberDecimal('63.13'),
  },
  {
    'customer_id': 'jjones@tepidmail.com',
    'orderdate': ISODate('2020-12-26T08:55:46Z'),
    'product_name': 'Asus Laptop',
    'product_variation': 'Normal Display',
    'value': NumberDecimal('429.65'),
  },
]);
```


## Aggregation Pipeline(s)

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Join by 2 fields in in products collection to 2 fields in orders collection
  {'$lookup': {
    'from': 'orders',
    'let': {
      'prdname': '$name',
      'prdvartn': '$variation',
    },
    // Embedded pipeline to control how the join is matched
    'pipeline': [
      // Join by two fields in each side
      {'$match':
        {'$expr':
          {'$and': [
            {'$eq': ['$product_name',  '$$prdname']},
            {'$eq': ['$product_variation',  '$$prdvartn']},            
          ]},
        },
      },

      // Match only orders made in 2020
      {'$match': {
        'orderdate': {
          '$gte': ISODate('2020-01-01T00:00:00Z'),
          '$lt': ISODate('2021-01-01T00:00:00Z'),
        }
      }},
      
      // Exclude some unwanted fields from the right side of the join
      {'$project': { 
        '_id': 0,
        'product_name': 0,
        'product_variation': 0,
      }},
    ],
    as: 'orders',
  }},

  // Only show products that have at least one order
  {'$match': {
    orders: {$not: {$size: 0}},
  }},

  // Omit unwanted fields
  {'$unset': [
    '_id',
  ]}, 
];
```

## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.products.aggregate(pipeline);
```

```javascript
db.products.explain('executionStats').aggregate(pipeline);
```


## Expected Results

Two documents should be returned, representing the two products that had one or more orders in 2020, with the orders embedded in an array against each product, as shown below:

```javascript
[
  {
    name: 'Asus Laptop',
    variation: 'Normal Display',
    category: 'ELECTRONICS',
    description: 'Good value laptop for students',
    orders: [
      {
        customer_id: 'elise_smith@myemail.com',
        orderdate: 2020-05-30T08:35:52.000Z,
        value: Decimal128("431.43")
      },
      {
        customer_id: 'jjones@tepidmail.com',
        orderdate: 2020-12-26T08:55:46.000Z,
        value: Decimal128("429.65")
      }
    ]
  },
  {
    name: 'Morphy Richards Food Mixer',
    variation: 'Deluxe',
    category: 'KITCHENWARE',
    description: 'Luxury mixer turning good cakes into great',
    orders: [
      {
        customer_id: 'oranieri@warmmail.com',
        orderdate: 2020-01-01T08:25:37.000Z,
        value: Decimal128("63.13")
      }
    ]
  }
]
```


## Observations & Comments

 * __Multiple Join Fields.__ When a join needs to be made using two or more fields, rather than providing `localField` and `foreignField` parameters for `$lookup`, a more 'open ended' `let` parameter is required to bind fields from the left side of the join into variables ready to be used in the joining process. Then the `$lookup`'s embedded `$pipeline` is used to define how to perform the join, which basically constitutes a `$match` stage using the bind variables to test for equality with the corresponding fields of the right side collection.
 
 * __Reducing Array Content.__ As a consequence of having an embedded pipeline in the `$lookup` stage, in this example, an opportunity is taken to filter out unwanted fields from the right side of the join, rather than filtering these out when they appear as array elements later in the main top-level aggregation pipeline. If this filtering was left to afterwards, in the main pipeline, it would require either:
    1. An extra stage to unwind the joined array elements, followed by an extra stage to unset the fields to be excluded, followed by an extra stage to then re-group the unpacked records back up again.
    2. Use of one of the [Array Operators](https://docs.mongodb.com/manual/reference/operator/aggregation/#array-expression-operators), such as `$map`, which can seem a little more complicated at first, but is more optimal than the `$unwind\$unset\$group` option, as discussed in the [Pipeline Performance Considerations](../guides/performance.md) chapter of this book.

