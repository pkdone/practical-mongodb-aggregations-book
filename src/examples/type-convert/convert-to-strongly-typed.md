# Strongly-Typed Conversion

__Minimum MongoDB Version:__ 4.2


## Scenario

A 3rd party has imported a set of _retail orders_ into a MongoDB collection but with all data typing lost (it stored all field values as strings). You want to re-establish correct typing for all the documents and copy them into a new "cleaned" collection. You can incorporate such type transformation logic in the aggregation pipeline because you know the type each field had in the original record structure.

> _Unlike most examples in this book, the aggregation pipeline writes its output to a collection rather than streaming the results back to the calling application._


## Sample Data Population

Drop any old version of the database (if it exists) and then populate a new `orders` collection with three orders documents, where each order has text fields only (note, the second document is intentionality missing the field `reported` in the sub-document `further_info`):

```javascript
db = db.getSiblingDB("book-convert-to-strongly-typed");
db.dropDatabase();

// Insert orders documents
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


## Aggregation Pipeline

Define a pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Convert strings to required types
  {"$set": {
    "order_date": {"$toDate": "$order_date"},    
    "value": {"$toDecimal": "$value"},
    "further_info.item_qty": {"$toInt": "$further_info.item_qty"},
    "further_info.reported": {"$switch": {
      "branches": [
        {"case": {"$eq": [{"$toLower": "$further_info.reported"}, "true"]}, "then": true},
        {"case": {"$eq": [{"$toLower": "$further_info.reported"}, "false"]}, "then": false},
      ],
      "default": {"$ifNull": ["$further_info.reported", "$$REMOVE"]},
    }},     
  }},     
  
  // Output to an unsharded or sharded collection
  {"$merge": {
    "into": "orders_typed",
  }},    
];
```


## Execution

Execute the aggregation using the defined pipeline to generate and populate a new collection called `orders_typed`:

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

The same number of documents should appear in the new `orders_typed` collection as the source collection had, with the same field structure and fields names, but now using strongly-typed boolean/date/integer/decimal values where appropriate, as shown below:

```javascript
[
  {
    _id: ObjectId('6064381b7aa89666258201fd'),
    customer_id: 'elise_smith@myemail.com',
    further_info: { 
      item_qty: 3, 
      reported: false 
    },
    order_date: ISODate('2020-05-30T08:35:52.000Z'),
    value: NumberDecimal('231.43')
  },
  {
    _id: ObjectId('6064381b7aa89666258201fe'),
    customer_id: 'oranieri@warmmail.com',
    further_info: {
      item_qty: 2 
    },
    order_date: ISODate('2020-01-01T08:25:37.000Z'),
    value: NumberDecimal('63.13')
  },
  {
    _id: ObjectId('6064381b7aa89666258201ff'),
    customer_id: 'tj@wheresmyemail.com',\
    further_info: {
      item_qty: 1,
      reported: true
    },
    order_date: ISODate('2019-05-28T19:13:32.000Z'),
    value: NumberDecimal('2.01')
  }
]
```


## Observations

 * __Boolean Conversion.__ The pipeline's conversions for integers, decimals, and dates are straightforward using the corresponding operator expressions, `$toInt`, `$toDecimal` and `$toDate`. However, the operator expression `$toBool` is not used for the boolean conversion. This is because `$toBool` will convert any non-empty string to _true_ regardless of its value. As a result, the pipeline uses a `$switch` operator to compare the lowercase version of strings with the text `'true'` and `'false'`, returning the matching boolean.
 
 * __Preserving Non-Existence.__ The field `further_info.reported` is an optional field in this scenario. The field may not always appear in a document, as illustrated by one of the three documents in the example. If a field is not present in a document, this potentially significant fact should never be lost. The pipeline includes additional logic for the `further_info.reported` field to preserve this information. The pipeline ensures the field is not included in the output document if it didn't exist in the source document. A `$ifNull` conditional operator is used, which returns the `$$REMOVE` marker flag if the field is missing, instructing the aggregation engine to omit it.

 * __Output To A Collection.__ The pipeline uses a `$merge` stage to instruct the aggregation engine to write the output to a collection rather than returning a stream of results. For this example, the default settings for `$merge` are sufficient. Each transformed record coming out of the aggregation pipeline becomes a new record in the target collection. The pipeline could have used a `$out` rather than a `$merge` stage. However, because `$merge` supports both unsharded and sharded collections, whereas `$out` only supports the former, `$merge` provides a more universally applicable example. If your aggregation needs to create a brand new unsharded collection, `$out` may be a little faster because the aggregation will completely replace the existing collection if it exists. Using `$merge`, the system has to perform more checks for every record the aggregation inserts (even though, in this case, it will be to a new collection).

 * __Trickier Date Conversions.__ In this example, the date strings contain all the date parts required by the `$toDate` operator to perform a conversion correctly. In some situations, this may not be the case, and a date string may be missing some valuable information (e.g. which century a 2-character year string is for, such as the century `19` or `21`). To understand how to deal with these cases, see the [Convert Incomplete Date Strings](./convert-incomplete-dates.md) example chapter.

