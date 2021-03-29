# Incremental Analytics

__Minimum MongoDB Version:__ 4.2


## Scenario

A user wants to periodically generate a summary report to understand the state of their business, where this report draws from both the most recently captured business data plus all the existing order which have occurred over the last year, to spot trends. Additionally, even though the data-set will increase in size over time, the user does not want to have to wait an increasing amount of time, whenever they need the most up to date version of the report. If report generation time increases as the historic data-set size increases, this would gradually slow down the organisation's ability to make decisions based on business insight.

In this example, a retailer has a collection of all shop orders made since they began trading and new order records are continuously added to the collection, as they occur, throughout each day. To simulate this, 5 shop orders are captured on 01-Feb-2021 and at the end of the day an aggregation is run just to generate an order summary for that day (count of orders, total order value) with the output placed as a new summary record in a summary collection The next day 4 shop orders are captured on 02-Feb-2021 and again an aggregation is run at end of day for just that day's orders generating a day summary record in the summary collection. TODO: simulate retrospective order. TODO: instead of producing an output to return, writes to a collection instead.


## Sample Data Population

Drop the old version of the database (if it exists) and then add 9 documents to the `orders` collection representing 5 orders on 01-Feb-2021 and 4 orders on 02-Feb-2021:

```javascript
use book-incremental-analytics;
db.dropDatabase();

// Create index for a daily_orders_summary collection
db.daily_orders_summary.createIndex({'day': 1}, {'unique': true});

// Create index for a orders collection
db.orders.createIndex({'orderdate': 1});

// Insert 9 records into the orders collection
// (5 orders for 1st Feb, 4 orders for 2nd Feb)
db.orders.insertMany([
  {
    'orderdate': ISODate('2021-02-01T08:35:52Z'),
    'value': NumberDecimal('231.43'),
  },
  {
    'orderdate': ISODate('2021-02-01T09:32:07Z'),
    'value': NumberDecimal('99.99'),
  },
  {
    'orderdate': ISODate('2021-02-01T08:25:37Z'),
    'value': NumberDecimal('63.13'),
  },
  {
    'orderdate': ISODate('2021-02-01T19:13:32Z'),
    'value': NumberDecimal('2.01'),
  },  
  {
    'orderdate': ISODate('2021-02-01T22:56:53Z'),
    'value': NumberDecimal('187.99'),
  },
  {
    'orderdate': ISODate('2021-02-02T23:04:48Z'),
    'value': NumberDecimal('4.59'),
  },
  {
    'orderdate': ISODate('2021-02-02T08:55:46Z'),
    'value': NumberDecimal('48.50'),
  },
  {
    'orderdate': ISODate('2021-02-02T07:49:32Z'),
    'value': NumberDecimal('1024.89'),
  },
  {
    'orderdate': ISODate('2021-02-02T13:49:44Z'),
    'value': NumberDecimal('102.24'),
  },
]);

```


## Aggregation Pipeline(s)

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Match orders for one day only
  {'$match': {
    'orderdate': {
      '$gte': 'START',
      '$lt': 'END',
    }
  }},
  
  // Group all orders together into one summary record for the day
  {'$group': {
    '_id': null,
    'date_parts': {'$first': {'$dateToParts': {'date': '$orderdate'}}},
    'total_value': {'$sum': '$value'},
    'total_orders': {'$sum': 1},
  }},
    
  // Get date parts from 1 order (need year+month+day, for UTC)
  {'$set': {
    'day': {
      '$dateFromParts': {
        'year': '$date_parts.year', 
        'month': '$date_parts.month',
        'day':'$date_parts.day'
     }
   },
  }},
      
  // Omit unwanted field
  {'$unset': [
    '_id',
    'date_parts',
  ]},
  
  // Add day summary to summary collection (overwrite if already exists)
  {'$merge': {
    'into': 'daily_orders_summary',
    'on': 'day',
    'whenMatched': 'replace',
    'whenNotMatched': 'insert'
  }},   
];
```

## Execution

For 01-Feb-2021 orders, execute the aggregation using the defined pipeline: 

```javascript
// Change the start and end date boundaries in the pipeline
pipeline[0]['$match']['orderdate']['$gte'] = ISODate('2021-02-01T00:00:00Z');
pipeline[0]['$match']['orderdate']['$lt'] = ISODate('2021-02-02T00:00:00Z');

// Run aggregation for 01-Feb-2021 orders & put result in summary collection
db.orders.aggregate(pipeline);

// View the summary collection content (should be 1 record only)
db.daily_orders_summary.find()
```

From the results you can see that only an order summary has been generated for 01-Feb-2021 only containing the total value and total number of orders for that day.

Now for the next day, for 02-Feb-2021 orders, execute the aggregation again:

```javascript
// Change the start and end date boundaries in the pipeline
pipeline[0]['$match']['orderdate']['$gte'] = ISODate('2021-02-02T00:00:00Z');
pipeline[0]['$match']['orderdate']['$lt'] = ISODate('2021-02-03T00:00:00Z');

// Run aggregation for 02-Feb-2021 orders & put result in summary collection
db.orders.aggregate(pipeline);

// View the summary collection content (should be 2 record now)
db.daily_orders_summary.find()
```

From the results you can see now see that order summaries exist for both days now.

To simulate the company retrospectively having to correct some older orders, add a new 'high value' order for the first day in the source _orders_ collection, then run re-run the aggregation for the first day 01-Feb-2021 to see if this correctly recalculates the order summary for the old day:

```javascript
// Restrospectively add an order to an older day (01-Feb-2021)
db.orders.insertOne(
  {
    'orderdate': ISODate('2021-02-01T09:32:07Z'),
    'value': NumberDecimal('11111.11'),
  },
)

// Change the start and end date boundaries in the pipeline
pipeline[0]['$match']['orderdate']['$gte'] = ISODate('2021-02-01T00:00:00Z');
pipeline[0]['$match']['orderdate']['$lt'] = ISODate('2021-02-02T00:00:00Z');

// Re-run aggregation for 01-Feb-2021 orders overwriting 1st record in summary collections
db.orders.aggregate(pipeline);

// View the summary collection content (should still be 2 records but 1st changed)
db.daily_orders_summary.find()
```

From the results you can now see that order summaries still exist for the two days, but the total value and order count for the first day has been updated/

For completeness, view the explain plan for the aggregation pipeline:

```javascript
db.products.explain('executionStats').aggregate(pipeline);
```


## Expected Results

The content of the `daily_orders_summary` collection after just running the aggregation for the 1<sup>st</sup> day should be similar to below:

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

The content of the `daily_orders_summary` collection after re-running the aggregation for the 1<sup>st</sup> day again, following an addition of a missed order for the old day, should be similar to below (notices the first record now show a value for `total_orders` which is one greater than before, and the value for `total_value` is now significantly greater than before:

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

  * __Merge Stage.__ The significant difference in this example's aggregation pipeline and any other examples in this book is that rather than the output of the aggreation pipeline being a stream of records passed back to the client application, the records are streamed into a collection which is different than the source collection. The key mechanism that makes this happen is the inclusion of a `$merge` stage as the very last stage in the pipeline. Rhe configuraiton of `$merge` used in this example is dictated to insert a new record in the output collection of a matching one doesn't exist, or if it does already exist, replace the previous version. This makes sense for this partcular use case. For other uses of `$merge` different behavour can be specified like failing if there is no match or if there is a match merging the results of the new record in with the results of the existing record, where the resulting record is the combination of fields from both th exisitng an dnew versions, with the new version's fields taking precedence where it exists in both.
  
  * __Incremental Updates.__ As shown with just two days of shop orders (albeit with only a few orders to keep the example brief), after each new period of additions to the source collection (orders added for the new day, in this case), an aggregation can be run to generate or re-generate that day's summary only. Even after the source collection increasing in size over days, months or years, the time taken to update the summary collection stays roughly constant. In a real business scenario, the business might generate a graphical chart showing the changing trend of order amounts and values over the last year and may also choose to run another aggregation, this time over the _summary_ collection to very quickly show the total number and value of all orders for the past rolling year, without having to incur the cost of re-generating each day's values first. This example only has a few orders per day, but for real retailers, especially large ones there may actually be tens or hundreds of orders per day, with each order having a lot more detail. As a result, depending on the host hardware and other factors, it may take seconds or minutes to calculate a daily order summary for each day. Without applying an _incremental analytics_ approach, all orders for previous days in addition to the current day would have to analysed each day, meaning that over time, the time to generate the busies report will increase from seconds to minutes to hours.

 * __Idempotency.__ The larger the amount of orders per day (e.g. tens of thousands or more) and the granularity of orders summaries calculated (eg. maybe hourly summaries are generated for each day rather than just a daily summary, meaning that 24 summary records are inserted into the summary collection rather than just 1, for each run). Sometimes systems will failr (host machines may go down, whole data centres or regions may go down). If an aggregation workload which is generated symmary recorcs into the tagrrt collection fails half way through (e.g has only written 17 of 24 records so far), the summaries collection will be left in an indeterminate state which will show inccorrect results for at least one day. However, the aggregation pipeline above, especially via the way it uses `$merge` means that if an aggregatio nfails to complete it can just be run again to re-generate the results, replacing any exiesitng summary records and filling in the gaps. The same aggregation for the same time window can be run over and over again without changing any of the existing correct summery, meaning that the system overall is natuarrly self healing and tolerate of inadvertantly aborted aggreagtion jobs.
 
 * __Retrospective Changes.__ As highlighted by the example used here, sometimes an organiation may need to go back and correct some of data from previous time periods. For example, a bank may need to go back and correct a payment recorded for few days ago, due to some issue that was detected with the payment, days efter it was processed. Written the right way, sunular to the pipelien used in this example, it is simple to re-execute the aggreation pipeline for a prevuous time period, against the ypdated source collection and have the symmary collection just be ypdated for that afffected time period.

