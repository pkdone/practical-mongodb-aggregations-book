# Summarising Arrays For First, Last, Minimum, Maximum & Average Values

__Minimum MongoDB Version:__ 4.4 &nbsp;&nbsp; _(due to use of [$first](https://docs.mongodb.com/manual/reference/operator/aggregation/first-array-element/) and [$last](https://docs.mongodb.com/manual/reference/operator/aggregation/last-array-element/) array operators)_


## Scenario

You want to generate daily summaries for the exchange rates of foreign currency "pairs" (e.g. "Euro-to-USDollar"). You need to analyse an array of persisted hourly rates for each currency pair for each day. You will output a daily summary of the open (first), close (last), low (minimum), high (maximum) and average exchange rate values for each currency pair.


## Sample Data Population

Drop any old version of the database (if it exists) and then populate new _currency-pair daily_ records:

```javascript
use book-array-high-low-avg;
db.dropDatabase();

// Inserts records into the currency_pair_values collection
db.currency_pair_values.insertMany([
  {
    "currencyPair": "USD/GBP",
    "day": ISODate("2021-07-05T00:00:00.000Z"),
    "hour_values": [
      NumberDecimal("0.71903411"), NumberDecimal("0.72741832"), NumberDecimal("0.71997271"),
      NumberDecimal("0.73837282"), NumberDecimal("0.75262621"), NumberDecimal("0.74739202"),
      NumberDecimal("0.72972612"), NumberDecimal("0.73837292"), NumberDecimal("0.72393721"),
      NumberDecimal("0.72746837"), NumberDecimal("0.73787372"), NumberDecimal("0.73746483"),
      NumberDecimal("0.73373632"), NumberDecimal("0.75737372"), NumberDecimal("0.76783263"),
      NumberDecimal("0.75632828"), NumberDecimal("0.75362823"), NumberDecimal("0.74682282"),
      NumberDecimal("0.74628263"), NumberDecimal("0.74726262"), NumberDecimal("0.75376722"),
      NumberDecimal("0.75799222"), NumberDecimal("0.75545352"), NumberDecimal("0.74998835"),
    ],
  },
  {
    "currencyPair": "EUR/GBP",
    "day": ISODate("2021-07-05T00:00:00.000Z"),
    "hour_values": [
      NumberDecimal("0.86739394"), NumberDecimal("0.86763782"), NumberDecimal("0.87362937"),
      NumberDecimal("0.87373652"), NumberDecimal("0.88002736"), NumberDecimal("0.87866372"),
      NumberDecimal("0.87862628"), NumberDecimal("0.87374621"), NumberDecimal("0.87182626"),
      NumberDecimal("0.86892723"), NumberDecimal("0.86373732"), NumberDecimal("0.86017236"),
      NumberDecimal("0.85873636"), NumberDecimal("0.85762283"), NumberDecimal("0.85362373"),
      NumberDecimal("0.85306218"), NumberDecimal("0.85346632"), NumberDecimal("0.84647462"),
      NumberDecimal("0.84694720"), NumberDecimal("0.84723232"), NumberDecimal("0.85002222"),
      NumberDecimal("0.85468322"), NumberDecimal("0.85675656"), NumberDecimal("0.84811122"),
    ],
  },
]);
```


## Aggregation Pipeline

Define a pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Generate day summaries from the hourly array values
  {"$set": {
    "summary.open": {"$first": "$hour_values"},
    "summary.low": {"$min": "$hour_values"},
    "summary.high": {"$max": "$hour_values"},
    "summary.close": {"$last": "$hour_values"},
    "summary.average": {"$avg": "$hour_values"},
  }},

  // Exclude unrequired fields from each daily currency pair record
  {"$unset": [
    "_id",
    "hour_values",
  ]},
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.currency_pair_values.aggregate(pipeline);

db.currency_pair_values.explain("executionStats").aggregate(pipeline);
```


## Expected Results

Two documents should be returned, now showing the daily summary open, low, high, close and average prices for each currency pair:

```javascript
[
  {
    currencyPair: 'USD/GBP',
    day: ISODate("2021-07-05T00:00:00.000Z"),
    summary: {
      open: Decimal128("0.71903411"),
      low: Decimal128("0.71903411"),
      high: Decimal128("0.76783263"),
      close: Decimal128("0.74998835"),
      average: Decimal128("0.74275533")
    }
  },
  {
    currencyPair: 'EUR/GBP',
    day: ISODate("2021-07-05T00:00:00.000Z"),
    summary: {
      open: Decimal128("0.86739394"),
      low: Decimal128("0.84647462"),
      high: Decimal128("0.88002736"),
      close: Decimal128("0.84811122"),
      average: Decimal128("0.86186929875")
    }
  }
]
```



## Observations

 * __*$first* & *$last* For Earlier MongoDB Versions.__ MongoDB only introduced the `$first` and `$last` array operator expressions in version 4.4. However, it is straightforward for you to replace each one in the pipeline with an equivalent solution, using the `$arrayElemAt` operator. Below are the alternatives you can use instead of `$first` and `$last` to operator correctly in MongoDB versions before 4.4:

     ```javascript
     // $first equivalent
     "summary.open": {"$arrayElemAt": ["$hour_values", 0]},
       
     // $last equivalent  
     "summary.close": {"$arrayElemAt": ["$hour_values", -1]},
     ```

