# One-to-One Join

__Minimum MongoDB Version:__ 4.4 &nbsp;&nbsp; _(due to use of [$first](https://docs.mongodb.com/manual/reference/operator/aggregation/first-array-element/) array operator)_


## Scenario

You want to generate a report to list all shop purchases for 2020, showing the product's name and category for each order, rather than the product's id. To achieve this, you need to take the customer _orders_ collection and join each order record to the corresponding product record in the _products_ collection. There is a many:1 relationship between both collections, resulting in a 1:1 join when matching an order to a product. The join will use a single field comparison between both sides, based on the product's id.


## Sample Data Population

Drop any old version of the database (if it exists) and then populate new `products` and `orders` collections with documents spanning 2019-2021 (the database commands have been split in two to enable your clipboard to hold all the text - ensure you copy and execute each of the two sections):

&nbsp;__-Part 1-__

```javascript
use book-one-to-one-join;
db.dropDatabase();

// Create index for a products collection
db.products.createIndex({"id": 1});

// Insert 4 records into the products collection
db.products.insertMany([
  {
    "id": "a1b2c3d4",
    "name": "Asus Laptop",
    "category": "ELECTRONICS",
    "description": "Good value laptop for students",
  },
  {
    "id": "z9y8x7w6",
    "name": "The Day Of The Triffids",
    "category": "BOOKS",
    "description": "Classic post-apocalyptic novel",
  },
  {
    "id": "ff11gg22hh33",
    "name": "Morphy Richardds Food Mixer",
    "category": "KITCHENWARE",
    "description": "Luxury mixer turning good cakes into great",
  },
  {
    "id": "pqr678st",
    "name": "Karcher Hose Set",
    "category": "GARDEN",
    "description": "Hose + nosels + winder for tidy storage",
  },
]); 
```

&nbsp;__-Part 2-__

```javascript
// Create index for a orders collection
db.orders.createIndex({"orderdate": -1});

// Insert 4 records into the orders collection
db.orders.insertMany([
  {
    "customer_id": "elise_smith@myemail.com",
    "orderdate": ISODate("2020-05-30T08:35:52Z"),
    "product_id": "a1b2c3d4",
    "value": NumberDecimal("431.43"),
  },
  {
    "customer_id": "tj@wheresmyemail.com",
    "orderdate": ISODate("2019-05-28T19:13:32Z"),
    "product_id": "z9y8x7w6",
    "value": NumberDecimal("5.01"),
  },  
  {
    "customer_id": "oranieri@warmmail.com",
    "orderdate": ISODate("2020-01-01T08:25:37Z"),
    "product_id": "ff11gg22hh33",
    "value": NumberDecimal("63.13"),
  },
  {
    "customer_id": "jjones@tepidmail.com",
    "orderdate": ISODate("2020-12-26T08:55:46Z"),
    "product_id": "a1b2c3d4",
    "value": NumberDecimal("429.65"),
  },
]);
```


## Aggregation Pipeline

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Match only orders made in 2020
  {"$match": {
    "orderdate": {
      "$gte": ISODate("2020-01-01T00:00:00Z"),
      "$lt": ISODate("2021-01-01T00:00:00Z"),
    }
  }},

  // Join "product_id" in orders collection to "id" in products" collection
  {"$lookup": {
    "from": "products",
    "localField": "product_id",
    "foreignField": "id",
    "as": "product_mapping",
  }},

  // For this data model, will always be 1 record in right-side
  // of join, so take 1st joined array element
  {"$set": {
    "product_mapping": {"$first": "$product_mapping"},
  }},
  
  // Extract the joined embeded fields into top level fields
  {"$set": {
    "product_name": "$product_mapping.name",
    "product_category": "$product_mapping.category",
  }},
  
  // Omit unwanted fields
  {"$unset": [
    "_id",
    "product_id",
    "product_mapping",
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

Three documents should be returned, representing the three customers orders that occurred in 2020, but with each orders `product_id` field replaced by two new looked up fields, `product_name` and `product_category`, as shown below:

```javascript
[
  {
    customer_id: 'elise_smith@myemail.com',
    orderdate: ISODate('2020-05-30T08:35:52.000Z'),
    value: NumberDecimal('431.43'),
    product_name: 'Asus Laptop',
    product_category: 'ELECTRONICS'
  },
  {
    customer_id: 'oranieri@warmmail.com',
    orderdate: ISODate('2020-01-01T08:25:37.000Z'),
    value: NumberDecimal('63.13'),
    product_name: 'Morphy Richardds Food Mixer',
    product_category: 'KITCHENWARE'
  },
  {
    customer_id: 'jjones@tepidmail.com',
    orderdate: ISODate('2020-12-26T08:55:46.000Z'),
    value: NumberDecimal('429.65'),
    product_name: 'Asus Laptop',
    product_category: 'ELECTRONICS'
  }
]
```


## Observations

 * __Single Field Match.__ The pipeline includes a `$lookup` join between a single field from each collection. For an illustration of performing a join based on two or more matching fields, see the [Multi-Field Join & One-to-Many](./multi-one-to-many.html) example.
 
 * __First Element Assumption.__ In this particular data model example, the join between the two collections is 1:1. Therefore the returned array of joined elements coming out of the `$lookup` stage always contains precisely one array element. As a result, the pipeline extracts the data from this first array element only, using the `$first` operator. For an illustration of performing a 1:many join instead, see the [Multi-Field Join & One-to-Many](./multi-one-to-many.html) example.

