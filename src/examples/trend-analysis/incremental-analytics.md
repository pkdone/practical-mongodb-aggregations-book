# Incremental Analytics

__Minimum MongoDB Version:__ 4.2


## Scenario

You have a set of _shop orders_ accumulated over many years, with the retail channel adding new order records continuously to the _orders_ collection throughout each trading day. You want to frequently generate a summary report so management can understand the state of the business and react to changing business trends. Over the years, it takes increasingly longer to generate the report of all daily sums and averages because there is increasingly more days' worth of data to process. From now on, to address this problem, you will only generate each new day's summary analysis at the end of the day and store it in a different collection which accumulates the daily summary records over time.

Unlike most examples in this book, the aggregation pipeline writes its output to a collection rather than streaming the results back to the calling application.


## Sample Data Population

Drop any old version of the database (if it exists) and then add 9 documents to the `orders` collection representing 5 orders for 01-Feb-2021 and 4 orders for 02-Feb-2021:

```javascript
use book-incremental-analytics;
db.dropDatabase();

// Create index for a daily_orders_summary collection
db.daily_orders_summary.createIndex({"day": 1}, {"unique": true});

// Create index for a orders collection
db.orders.createIndex({"orderdate": 1});

// Insert records into the orders collection
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


## Aggregation Pipeline

Define a function to create a pipeline, but with the start and end date parameterised, ready to be used to perform the aggregation multiple times, for different days:

```javascript
function getDayAggPipeline(startDay, endDay) {
  return [
    // Match orders for one day only
    {"$match": {
      "orderdate": {
        "$gte": ISODate(startDay),
        "$lt": ISODate(endDay),
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
}
```

## Execution

For 01-Feb-2021 orders only, build the pipeline and execute the aggregation: 

```javascript
// Get the pipeline for the 1st day
var pipeline = getDayAggPipeline("2021-02-01T00:00:00Z", "2021-02-02T00:00:00Z");

// Run aggregation for 01-Feb-2021 orders & put result in summary collection
db.orders.aggregate(pipeline);

// View the summary collection content (should be 1 record only)
db.daily_orders_summary.find()
```

From the results, you can see that only a single order summary has been generated, for 01-Feb-2021, containing the total value and number of orders for that day.

Now for the next day only (for 02-Feb-2021 orders), build the pipeline and execute the aggregation: 

```javascript
// Get the pipeline for the 2nd day
var pipeline = getDayAggPipeline("2021-02-02T00:00:00Z", "2021-02-03T00:00:00Z");

// Run aggregation for 02-Feb-2021 orders & put result in summary collection
db.orders.aggregate(pipeline);

// View the summary collection content (should be 2 record now)
db.daily_orders_summary.find()
```

From the results, you can see that order summaries exist for both days.

To simulate the organisation's occasional need to correct an old order retrospectively, go back and add a new "high value" order for the first day. Then re-run the aggregation for the first day only (01-Feb-2021) to show that you can safely and correctly recalculate the summary for just one day:

```javascript
// Retrospectively add an order to an older day (01-Feb-2021)
db.orders.insertOne(
  {
    "orderdate": ISODate("2021-02-01T09:32:07Z"),
    "value": NumberDecimal("11111.11"),
  },
)

// Get the pipeline for the 1st day again
var pipeline = getDayAggPipeline("2021-02-01T00:00:00Z", "2021-02-02T00:00:00Z");

// Re-run aggregation for 01-Feb-2021 overwriting 1st record in summary collections
db.orders.aggregate(pipeline);

// View the summary collection content (should still be 2 records but 1st changed)
db.daily_orders_summary.find()
```

From the results, you can see that two order summaries still exist, one for each of the two trading days, but the total value and order count for the first day has changed.

For completeness, also view the explain plan for the aggregation pipeline:

```javascript
db.products.explain("executionStats").aggregate(pipeline);
```


## Expected Results

The content of the `daily_orders_summary` collection after running the aggregation for just the 1st day should be similar to below:

```javascript
[
  {
    _id: ObjectId('6062102e7eeb772e6ca96bc7'),
    total_value: NumberDecimal('584.55'),
    total_orders: 5,
    day: ISODate('2021-02-01T00:00:00.000Z')
  }
]
```

The content of the `daily_orders_summary` collection after running the aggregation for the 2nd day should be similar to below:

```javascript
[
  {
    _id: ObjectId('6062102e7eeb772e6ca96bc7'),
    total_value: NumberDecimal('584.55'),
    total_orders: 5,
    day: ISODate('2021-02-01T00:00:00.000Z')
  },
  {
    _id: ObjectId('606210377eeb772e6ca96bcc'),
    total_value: NumberDecimal('1180.22'),
    total_orders: 4,
    day: ISODate('2021-02-02T00:00:00.000Z')
  }
]
```

After re-running the aggregation for the 1st day following the addition of the missed order, the content of the `daily_orders_summary` collection should be similar to below (notice the first record now shows a value of one greater than before for `total_orders`, and for `total_value` the value is now significantly higher):

```javascript
[
  {
    _id: ObjectId('6062102e7eeb772e6ca96bc7'),
    total_value: NumberDecimal('11695.66'),
    total_orders: 6,
    day: ISODate('2021-02-01T00:00:00.000Z')
  },
  {
    _id: ObjectId('606210377eeb772e6ca96bcc'),
    total_value: NumberDecimal('1180.22'),
    total_orders: 4,
    day: ISODate('2021-02-02T00:00:00.000Z')
  }
]
```


## Observations

 * __Merging Results.__ The pipeline uses a `$merge` stage to instruct the aggregation engine to write the output to a collection rather than returning a stream of results. In this example, with the options you provide to `$merge`, the aggregation inserts a new record in the destination collection if a matching one doesn't already exist. If a matching record already exists, it replaces the previous version.

 * __Incremental Updates.__ The example illustrates just two days of shop orders, albeit with only a few orders, to keep the example simple. At the end of each new trading day, you run the aggregation pipeline to generate the current day's summary only. Even after the source collection has increased in size over many years, the time it takes you to bring the summary collection up to date again stays constant. In a real-world scenario, the business might expose a graphical chart showing the changing daily orders trend over the last rolling year. This charting dashboard is not burdened by the cost of periodically regenerating values for all days in the year. There could be hundreds of thousands of orders received per day for real-world retailers, especially large ones. A day's summary may take many seconds to generate in that situation. Without an _incremental analytics_ approach, if you need to generate a year's worth of daily summaries every time, it would take hours to refresh the business dashboard.

 * __Idempotency.__ If a retailer is aggregating tens of thousands of orders per day, then during end-of-day processing, it may choose to generate 24 hourly summary records rather than a single daily record. This provides the business with finer granularity to understand trends better. As with any software process, when generating hourly results into the summary collection, there is the risk of not fully completing if a system failure occurs. If an in-flight aggregation terminates abnormally, it may not have written all 24 summary collection records. The failure leaves the summary collection in an indeterminate and incomplete state for one of its days. However, this isn't a problem because of the way the aggregation pipeline uses the `$merge` stage. When an aggregation fails to complete, it can just be re-run. When re-run, it will regenerate all the results for the day, replacing existing summary records and filling in the missing ones. The aggregation pipeline is idempotent, and you can run it repeatedly without damaging the summary collection. The overall solution is self-healing and naturally tolerant of inadvertently aborted aggregation jobs.

 * __Retrospective Changes.__ Sometimes, an organisation may need to go back and correct records from the past, as illustrated in this example. For instance, a bank may need to fix a past payment record due to a settlement issue that only comes to light weeks later. With the approach used in this example, it is straightforward to re-execute the aggregation pipeline for a prior date, using the updated historical data. This will correctly update the specific day's summary data only, to reflect the business's current state.

