# Incremental Analytics

__Minimum MongoDB Version:__ 4.2


## Scenario

A user wants to frequently generate a summary report to understand the state of their business, where the report draws from both the most recently captured business data plus all previous data which has been recorded over the last year. By having a frequently updated view of the last rolling year, the user is better equipped to spot business trends and respond to these accordingly. However, although the data-set will grow larger over time, the user does not want to have to wait an increasing amount of time for the analytics job to complete, whenever the most up to date version of the report is required.

In this example, a retailer has a set of _shop orders_ collected over a number of years. New order records are continuously added to the collection throughout each trading day. To simulate the requirement in a much reduced and simplified way, in this example 5 shop orders are captured on 01-Feb-2021 and at the end of the day an aggregation is run to generate an order summary record for that day only. The order summary record created by the aggregation pipeline for the one day includes a count of orders for the day and the total order value for the day. The aggregation then places this record directly into a summary collection, which is different than 'normal' aggregations which would usually just return the aggregation's results to the client application. The next day, on 02-Feb-2021, 4 new shop orders are captured and again an aggregation is run at end of day for just that day's orders, generating a new day summary record into the summary collection. Additionally, the user is able to go back to a previous day, if some orders need to be retrospectively 'corrected' for that day, make those order changes and then reliably re-generate the results for that day.


## Sample Data Population

Drop the old version of the database (if it exists) and then add 9 documents to the `orders` collection representing 5 orders for 01-Feb-2021 and 4 orders for 02-Feb-2021:

```javascript
use book-incremental-analytics;
db.dropDatabase();

// Create index for a daily_orders_summary collection
db.daily_orders_summary.createIndex({"day": 1}, {"unique": true});

// Create index for a orders collection
db.orders.createIndex({"orderdate": 1});

// Insert 9 records into the orders collection
// (5 orders for 1st Feb, 4 orders for 2nd Feb)
db.orders.insertMany([
  {
    "orderdate": ISODate("2021-02-01T08:35:52Z"),
    "value": NumberDecimal("231.43"),
  },
  {
    "orderdate": ISODate("2021-02-01T09:32:07Z"),
    "value": NumberDecimal("99.99"),
  },
  {
    "orderdate": ISODate("2021-02-01T08:25:37Z"),
    "value": NumberDecimal("63.13"),
  },
  {
    "orderdate": ISODate("2021-02-01T19:13:32Z"),
    "value": NumberDecimal("2.01"),
  },  
  {
    "orderdate": ISODate("2021-02-01T22:56:53Z"),
    "value": NumberDecimal("187.99"),
  },
  {
    "orderdate": ISODate("2021-02-02T23:04:48Z"),
    "value": NumberDecimal("4.59"),
  },
  {
    "orderdate": ISODate("2021-02-02T08:55:46Z"),
    "value": NumberDecimal("48.50"),
  },
  {
    "orderdate": ISODate("2021-02-02T07:49:32Z"),
    "value": NumberDecimal("1024.89"),
  },
  {
    "orderdate": ISODate("2021-02-02T13:49:44Z"),
    "value": NumberDecimal("102.24"),
  },
]);

```


## Aggregation Pipeline(s)

Define a single pipeline ready to perform the aggregation (the use of `'START'` and `'END'` placeholder values is intentional):

```javascript
var pipeline = [
  // Match orders for one day only
  {"$match": {
    "orderdate": {
      "$gte": "START",
      "$lt": "END",
    }
  }},
  
  // Group all orders together into one summary record for the day
  {"$group": {
    "_id": null,
    "date_parts": {"$first": {"$dateToParts": {"date": "$orderdate"}}},
    "total_value": {"$sum": "$value"},
    "total_orders": {"$sum": 1},
  }},
    
  // Get date parts from 1 order (need year+month+day, for UTC)
  {"$set": {
    "day": {
      "$dateFromParts": {
        "year": "$date_parts.year", 
        "month": "$date_parts.month",
        "day":"$date_parts.day"
     }
   },
  }},
      
  // Omit unwanted field
  {"$unset": [
    "_id",
    "date_parts",
  ]},
  
  // Add day summary to summary collection (overwrite if already exists)
  {"$merge": {
    "into": "daily_orders_summary",
    "on": "day",
    "whenMatched": "replace",
    "whenNotMatched": "insert"
  }},   
];
```

## Execution

For 01-Feb-2021 orders only, execute the aggregation using the defined pipeline (first setting the one-day date range accordingly): 

```javascript
// Change the start and end date boundaries in the pipeline
pipeline[0]["$match"]["orderdate"]["$gte"] = ISODate("2021-02-01T00:00:00Z");
pipeline[0]["$match"]["orderdate"]["$lt"] = ISODate("2021-02-02T00:00:00Z");

// Run aggregation for 01-Feb-2021 orders & put result in summary collection
db.orders.aggregate(pipeline);

// View the summary collection content (should be 1 record only)
db.daily_orders_summary.find()
```

From the results you can see that only a single order summary has been generated, for 01-Feb-2021, containing the total value and total number of orders for that day.

Now for the next day only (for 02-Feb-2021 orders), execute the aggregation again (first setting the new one-day date range accordingly):

```javascript
// Change the start and end date boundaries in the pipeline
pipeline[0]["$match"]["orderdate"]["$gte"] = ISODate("2021-02-02T00:00:00Z");
pipeline[0]["$match"]["orderdate"]["$lt"] = ISODate("2021-02-03T00:00:00Z");

// Run aggregation for 02-Feb-2021 orders & put result in summary collection
db.orders.aggregate(pipeline);

// View the summary collection content (should be 2 record now)
db.daily_orders_summary.find()
```

From the results you can see see that order summaries exist for both days now.

To simulate the occasional need for the organisation to retrospectively correct an old order, go back and add a new 'high value' order for the first day in the source _orders_ collection, then run re-run the aggregation for the first day only (01-Feb-2021) to show that the summary for just the one day can be safely and correctly recalculated:

```javascript
// Restrospectively add an order to an older day (01-Feb-2021)
db.orders.insertOne(
  {
    "orderdate": ISODate("2021-02-01T09:32:07Z"),
    "value": NumberDecimal("11111.11"),
  },
)

// Change the start and end date boundaries in the pipeline
pipeline[0]["$match"]["orderdate"]["$gte"] = ISODate("2021-02-01T00:00:00Z");
pipeline[0]["$match"]["orderdate"]["$lt"] = ISODate("2021-02-02T00:00:00Z");

// Re-run aggregation for 01-Feb-2021 overwriting 1st record in summary collections
db.orders.aggregate(pipeline);

// View the summary collection content (should still be 2 records but 1st changed)
db.daily_orders_summary.find()
```

From the results you can now see that two order summaries still exist, one for each of the two trading days, but the total value and order count for the first day has been changed.

For completeness, also view the explain plan for the aggregation pipeline:

```javascript
db.products.explain("executionStats").aggregate(pipeline);
```


## Expected Results

The content of the `daily_orders_summary` collection after running the aggregation for just the 1<sup>st</sup> day should be similar to below:

```javascript
[
  {
    _id: ObjectId("6062102e7eeb772e6ca96bc7"),
    total_value: Decimal128("584.55"),
    total_orders: 5,
    day: 2021-02-01T00:00:00.000Z
  }
]
```

The content of the `daily_orders_summary` collection after running the aggregation for the 2<sup>nd</sup> day should be similar to below:

```javascript
[
  {
    _id: ObjectId("6062102e7eeb772e6ca96bc7"),
    total_value: Decimal128("584.55"),
    total_orders: 5,
    day: 2021-02-01T00:00:00.000Z
  },
  {
    _id: ObjectId("606210377eeb772e6ca96bcc"),
    total_value: Decimal128("1180.22"),
    total_orders: 4,
    day: 2021-02-02T00:00:00.000Z
  }
]
```

After re-running the aggregation for the 1<sup>st</sup> day following the addition of the missed order, the content of the `daily_orders_summary` collection should be similar to below (notice the first record now shows a value of one greater than before for `total_orders`, and for `total_value` the value is now significantly higher):

```javascript
[
  {
    _id: ObjectId("6062102e7eeb772e6ca96bc7"),
    total_value: Decimal128("11695.66"),
    total_orders: 6,
    day: 2021-02-01T00:00:00.000Z
  },
  {
    _id: ObjectId("606210377eeb772e6ca96bcc"),
    total_value: Decimal128("1180.22"),
    total_orders: 4,
    day: 2021-02-02T00:00:00.000Z
  }
]
```


## Observations & Comments

  * __Merge Stage.__ The significant difference for this example's aggregation pipeline, compared with the others in this book, is that the output of the aggregation pipeline's is not a stream of records passed back to the client application. Instead, the records are streamed into a different collection. The key mechanism that makes this happen is the inclusion of a `$merge` stage at the very end of the pipeline. The use of `$merge` in this example is to insert a new record in the destination collection if a matching one doesn't exist. If a matching record already exists, it instead replaces the previous version. This behaviour makes sense for this particular use case. There are other ways `$merge` can be used though, for different uses cases. `$merge` can be told to fail if there is no match. If there is a match, `$merge` can be told to blend the content of the new record into the existing record. The updated record is essentially the combination of fields from both the pre-existing record and the new record, with the new version's fields taking precedence, wherever there is a clash.
  
  * __Incremental Updates.__ The example illustrates just two days of shop orders, albeit with only a few orders to keep the example simple. At the end of each new day of new orders captured, the aggregation pipeline can be re-run to generate that day's summary only. Even after the source collection has increased in size over many days, months or years, the time taken to update the summary collection stays roughly constant (the time taken to process just one day's worth of orders). In a real-world scenario, the business might generate a graphical chart showing the changing trend of daily orders over the last year, or it might choose to run a different aggregation over the _summary_ collection, to very quickly produce the total number and value of orders for the whole year. This process does not have to incur the cost of re-generating each day's values first. The example in this chapter only has a few orders per day, but for real retailers, especially large ones, there could actually be tens of thousands or hundreds of thousands of orders received per day. In such situations, it may take a tens of seconds to calculate a daily order summary for one day, which is fine. However, without applying an _incremental analytics_ approach, all orders for previous days would have to re-analysed each time too. Over the weeks and months the wait for a business report to generated would increase from seconds to minutes to hours without such an _incremental analytics_ approach.

 * __Idempotency.__ For real world situations, when aggregating tens of thousands of orders per day to produce a daily summary, the opportunity for a system failure to occur whilst an aggregation is in mid-flight, is far greater. Also, in such large scale solutions, rather than generating just a single summary for a day's worth of trading, the aggregation may be generating a set of 24 hourly summary records for that day, into a summary collection. If an in-flight aggregation is abnormally terminated, it may have only written 17 of 24 records to the summaries collection, for example. This will leave the summary collection in an indeterminate and incomplete state for one of its days. However, this isn't a problem due to the way the aggregation pipeline is structured, especially with respect to the way it uses `$merge`. When an aggregation fails to complete, aggregation can just be re-run. When run again, it will regenerate all the results for the one day, replacing any already existing summary records and filling in the missing ones. The aggregation pipeline is idempotent and the same aggregation can be run over and over again for the same time window, without damaging the summaries data-set. The overall solution is self-healing and naturally tolerant of inadvertently aborted aggregation jobs.
 
 * __Retrospective Changes.__ Sometimes an organisation may need to go back and correct some of its data from previous time periods, as illustrated in the example used in this chapter. For example, a bank may need to go back and correct a payment processed and persisted a few days ago, due to issue that has only come to light days later. Constructed the right way, it is simple to re-execute the aggregation pipeline for a previous time period, against the now updated source collection, and have the summary collection be correctly updated for the affected time period (as this chapter's example showed).
 
