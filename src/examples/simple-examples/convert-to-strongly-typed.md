# Strongly Typed Conversion

__Minimum MongoDB Version:__ 4.2


## Scenario

A user has been given access to a collection, which when it was ingested, had all the fields' values persisted as strings even though some should have had other types such as numbers and dates. This situation sometimes occurs when a very basic [ETL](https://en.wikipedia.org/wiki/Extract,_transform,_load) tool (or a naive home-grown ingestion script) has been used to load data into a collection, and it was incapable of maintaining data typing. The user however wants a corrected version of the data-set with appropriate data typing reinstated. Only with proper data typing in place can the full power of the database and its query language be leveraged, including being able to correctly sort by numbers or dates and correctly perform comparisons between number or date values.

In this example, a collection of _orders_ documents has been persisted with all data typing lost. All field values are just stored as strings. An aggregation pipeline will be used to take all of the collection's documents and copy them into a new 'cleaned-up' collection. During the 'copy process' performed by the aggregation pipeline, each field will have its value transformed into the appropriate type (for those fields which shouldn't have been strings). Such logic can be applied because the pipeline developer has been provided with information detailing what type each field had in the original record structure had.

Unlike most examples in this book, the aggregation pipeline writes its output to a collection rather than streaming the results back to the calling application.


## Sample Data Population

Drop the old version of the database (if it exists) and then populate a new `orders` collection with 3 orders documents, where each order has text fields only (note, the second document is intentionality missing the field `reported` in the sub-document `further_info`):

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


## Aggregation Pipeline

Define a single pipeline ready to perform the aggregation:

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

The same number of documents should appear in the new `orders_typed` collection as was present in the source collection, with the exact same field structure and fields names, but now using strongly typed boolean/date/integer/decimal values where appropriate, as shown below:

```javascript
[
  {
    _id: ObjectId("6064381b7aa89666258201fd"),
    customer_id: 'elise_smith@myemail.com',
    further_info: { 
      item_qty: 3, 
      reported: false 
    },
    order_date: 2020-05-30T08:35:52.000Z,
    value: Decimal128("231.43")
  },
  {
    _id: ObjectId("6064381b7aa89666258201fe"),
    customer_id: 'oranieri@warmmail.com',
    further_info: {
      item_qty: 2 
    },
    order_date: 2020-01-01T08:25:37.000Z,
    value: Decimal128("63.13")
  },
  {
    _id: ObjectId("6064381b7aa89666258201ff"),
    customer_id: 'tj@wheresmyemail.com',
    further_info: {
      item_qty: 1,
      reported: true
    },
    order_date: 2019-05-28T19:13:32.000Z,
    value: Decimal128("2.01")
  }
]
```


## Observations & Comments

 * __Boolean Conversion.__ The pipeline's conversions for integers, decimals and dates are straight-forward and use the corresponding operator expressions, `$toInt`, `$toDecimal` and `$toDate`, respectively. For the boolean conversions though, the operator expression `$toBool` is not used. This is because the built-in operator just assumes that the conversion result for an input text field should be _true_ as long as the fields contains any string, regardless of whether the string is `'true'`, `'false'` or any other random text. As a result, the pipeline uses a `$switch` operator to compare the lowercase version of the field's text value to the strings `'true'` and `'false'`, to then return the boolean `true` or `false` respectively.
 
 * __Preserving Non-Existence.__ The field `further_info.reported`, in addition to needing to be a boolean is also an optional field in this particular scenario. The field may not always appear in a document as illustrated by one of the three documents in this example. The fact that a field is not present in a document is potentially important and this fact should not be lost. Therefore, to preserve this information, the pipeline includes additional logic for the `further_info.reported` field's conversion. This logic ensures that the field is not included in the output document if it didn't exist for the input document. A `$ifNull` conditional operator is used, which returns the `$$REMOVE` marker flag if the field is missing, to instruct the aggregation engine to omit the field.

 * __Output To A Collection.__ To instruct the aggregation engine to write the aggregation's output to a collection rather than returning a stream of results, the `$merge` stage is used at the end of the pipeline to name the target collection to write to. For this particular example, the default settings for `$merge` are sufficient which basically dictates that each transformed record coming out of the aggregation pipeline should become a new record in the target collection. The `$out` stage could have been used instead of the `$merge` and its default settings. However, because `$merge` supports both Unsharded and Sharded collections, whereas `$out` only supports the former, `$merge` provides a more universally applicable example. To better understand how `$mmerge` can be used with non-default parameters for more specific behaviour, see the [Incremental Analytics](../intricate-examples/incremental-analytics.md) example chapter. 

 * __Trickier Date Conversions.__ In this example the data strings to be converted contained all the date parts required by the `$toDate` conversion operator to generate a correct date-time value. In some situations this may not be the case though and a date string may be missing some valuable information (for example, which century the year part `79` or `21` applies to). To understand how to deal with these cases, see the [Convert Incomplete Date Strings](../intricate-examples/convert-incomplete-dates.md) example chapter.

