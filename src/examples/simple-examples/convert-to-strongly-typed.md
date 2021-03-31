# Convert To Strongly Typed

__Minimum MongoDB Version:__ 4.2


## Scenario

A user has been given access to a collection of documents, that unfortunately when ingested, had all its fields' values persisted as strings even though some of the fields should have had other types (numbers, dates, booleans). This situation can sometimes occur when a very basic [ETL](https://en.wikipedia.org/wiki/Extract,_transform,_load) tool, or a naive home-grown ingestion script, has been used to load data into a collection, and wasn't capable of maintaining data typing. The user wants an updated version of the data in MongoDB, where the appropriate data typing has been reinstated. With proper data typing in place the full power of the database and its query language can be leveraged including the ability to sort numbers and dates correctly and be able to use comparison expressions (e.g. less than, greater than) against numbers and dates which will not work correctly if these are held and compared as strings.

In this example, a collection of _orders_ documents has been persisted with all data type lost, where all field values are just stored as strings. An aggregation pipeline will be used to take all the documents in collection and copy them into a new 'cleaned-up' _orders_typed_ collection. During the 'copying process' performed by the aggregation pipeline, each field which was not supposed to be a string is transformed into a an appropriately typed field (date, boolean, decimal, integer). This is only possible because the developer of the aggregation pipeline has been given information about what types the fields in the original data set should had.

The pipeline employed in this example is unlike most examples in this book, because the output of the aggregation is written to a different collection rather than being streamed back to the client application that invoked the aggregation.


## Sample Data Population

Drop the old version of the database (if it exists) and then populate a new `orders` collection with 3 orders documents, where each order has text only fields (note, one document will be intentionality missing the field `reported` in the embedded document `further_info`):

```javascript
use book-convert-to-strongly-typed;
db.dropDatabase();

// Insert 3 orders documents
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
    "further_info.reported": {"$switch": {
      "branches": [
        {"case": {"$eq": [{"$toLower": "$further_info.reported"}, "true"]}, "then": true},
        {"case": {"$eq": [{"$toLower": "$further_info.reported"}, "false"]}, "then": false},
      ],
      "default": {"$ifNull": ["$further_info.reported", "$$REMOVE"]},
    }},     
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

Check the contents of the new `orders_typed` collection to ensure the relevant fields are now appropriately typed:

```javascript
db.orders_typed.find();
```

View the explain plan for the aggregation pipeline:

```javascript
db.orders.explain("executionStats").aggregate(pipeline);
```

## Expected Results

The same number of documents (three) should appear in the new `orders_typed` collection as was in the source collection `orders`, and with the exact same field structure and fields names but now using strongly typed boolean/date/integer/decimal values where appropriate , as shown below:

```javascript
[
  {
    _id: ObjectId("6064381b7aa89666258201fd"),
    customer_id: 'elise_smith@myemail.com',
    further_info: { item_qty: 3, reported: false },
    order_date: 2020-05-30T08:35:52.000Z,
    value: Decimal128("231.43")
  },
  {
    _id: ObjectId("6064381b7aa89666258201fe"),
    customer_id: 'oranieri@warmmail.com',
    further_info: { item_qty: 2 },
    order_date: 2020-01-01T08:25:37.000Z,
    value: Decimal128("63.13")
  },
  {
    _id: ObjectId("6064381b7aa89666258201ff"),
    customer_id: 'tj@wheresmyemail.com',
    further_info: { item_qty: 1, reported: true },
    order_date: 2019-05-28T19:13:32.000Z,
    value: Decimal128("2.01")
  }
]
```


## Observations & Comments

 * __Boolean Conversion.__ Todo.
 
 * __Retaining Non-Existence.__ Todo.

 * __Merge To Collection.__ Todo.

