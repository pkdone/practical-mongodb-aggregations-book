# Multi-Field Join & One-to-Many

__Minimum MongoDB Version:__ 4.2


## Scenario

You want to take a shop's _products_ collection and join each product record to all the product's orders stored in an _orders_ collection. There is a 1:many relationship between both collections, based on a match of two fields on each side. Rather than joining on a single field like `product_id` (which doesn't exist in this data set), you need to use two common fields to join (`product_name` and `product_variation`). The resulting report will show all the orders made for each product in 2020.

Note that the requirement to perform a 1:many join does not mandate the need to join by multiple fields on each side of the join. However, in this example, it has been deemed beneficial to show both of these aspects in one place.


## Sample Data Population

Drop the old version of the database (if it exists) and then populate new `products` and `orders` collections with documents spanning 2019-2021:

```javascript
use book-multi-one-to-many;
db.dropDatabase();

// Insert 6 records into the products collection
db.products.insertMany([
  {
    "name": "Asus Laptop",
    "variation": "Ultra HD",
    "category": "ELECTRONICS",
    "description": "Great for watching movies",
  },
  {
    "name": "Asus Laptop",
    "variation": "Normal Display",
    "category": "ELECTRONICS",
    "description": "Good value laptop for students",
  },
  {
    "name": "The Day Of The Triffids",
    "variation": "1st Edition",
    "category": "BOOKS",
    "description": "Classic post-apocalyptic novel",
  },
  {
    "name": "The Day Of The Triffids",
    "variation": "2nd Edition",
    "category": "BOOKS",
    "description": "Classic post-apocalyptic novel",
  },
  {
    "name": "Morphy Richards Food Mixer",
    "variation": "Deluxe",
    "category": "KITCHENWARE",
    "description": "Luxury mixer turning good cakes into great",
  },
  {
    "name": "Karcher Hose Set",
    "variation": "Full Monty",
    "category": "GARDEN",
    "description": "Hose + nosels + winder for tidy storage",
  },
]); 

// Create index for a orders collection
db.orders.createIndex({"product_name": 1, "product_variation": 1});

// Insert 4 records into the orders collection
db.orders.insertMany([
  {
    "customer_id": "elise_smith@myemail.com",
    "orderdate": ISODate("2020-05-30T08:35:52Z"),
    "product_name": "Asus Laptop",
    "product_variation": "Normal Display",
    "value": NumberDecimal("431.43"),
  },
  {
    "customer_id": "tj@wheresmyemail.com",
    "orderdate": ISODate("2019-05-28T19:13:32Z"),
    "product_name": "The Day Of The Triffids",
    "product_variation": "2nd Edition",
    "value": NumberDecimal("5.01"),
  },  
  {
    "customer_id": "oranieri@warmmail.com",
    "orderdate": ISODate("2020-01-01T08:25:37Z"),
    "product_name": "Morphy Richards Food Mixer",
    "product_variation": "Deluxe",
    "value": NumberDecimal("63.13"),
  },
  {
    "customer_id": "jjones@tepidmail.com",
    "orderdate": ISODate("2020-12-26T08:55:46Z"),
    "product_name": "Asus Laptop",
    "product_variation": "Normal Display",
    "value": NumberDecimal("429.65"),
  },
]);
```


## Aggregation Pipeline

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Join by 2 fields in in products collection to 2 fields in orders collection
  {"$lookup": {
    "from": "orders",
    "let": {
      "prdname": "$name",
      "prdvartn": "$variation",
    },
    // Embedded pipeline to control how the join is matched
    "pipeline": [
      // Join by two fields in each side
      {"$match":
        {"$expr":
          {"$and": [
            {"$eq": ["$product_name",  "$$prdname"]},
            {"$eq": ["$product_variation",  "$$prdvartn"]},            
          ]},
        },
      },

      // Match only orders made in 2020
      {"$match": {
        "orderdate": {
          "$gte": ISODate("2020-01-01T00:00:00Z"),
          "$lt": ISODate("2021-01-01T00:00:00Z"),
        }
      }},
      
      // Exclude some unwanted fields from the right side of the join
      {"$project": { 
        "_id": 0,
        "product_name": 0,
        "product_variation": 0,
      }},
    ],
    as: "orders",
  }},

  // Only show products that have at least one order
  {"$match": {
    orders: {$not: {$size: 0}},
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
db.products.aggregate(pipeline);
```

```javascript
db.products.explain("executionStats").aggregate(pipeline);
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

 * __Multiple Join Fields.__ To join two or more fields in a `$lookup` stage, you must use a `let` parameter rather than specifying the `localField` and `foreignField` parameters used in a single field join. With a `let` parameter, you bind multiple fields from the first collection into variables ready to be used in the joining process. You use an embedded `$pipeline` inside the `$lookup` stage to match the _bind_ variables with fields in the second collection's records. To access the _bind_ variables, the `$match` must use an `$expr` operator. In this instance, the`$expr` can use an index because only equality matches are employed.
 
 * __Reducing Array Content.__ The presence of an embedded pipeline in the `$lookup` stage provided an opportunity to filter out three unwanted fields brought in from the second collection. If you wanted to filter out these fields in a later step instead, inside the main pipeline, you could use one of the following two:
 
    1. Add an extra stage to unwind the joined array elements, followed by a stage to unset the fields to be excluded, followed by a stage to re-group the unpacked records.
    2. Use of one of the [Array Operators](https://docs.mongodb.com/manual/reference/operator/aggregation/#array-expression-operators), such as `$map`. This can seem a little more complicated at first, but it is more optimal than the `$unwind\$unset\$group` combination, as described in the [Pipeline Performance Considerations](../guides/performance.md) chapter.
    
