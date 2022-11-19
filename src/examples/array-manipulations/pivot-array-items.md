# Pivot Array Items By A Key

__Minimum MongoDB Version:__ 4.2


## Scenario

You have a set of geographically dispersed weather station zones where each zone has multiple sensor devices collecting readings such as temperature, humidity and pressure. Each weather station assembles readings from its devices and once per hour transmits this set of measurements to a central database to store. The set of persisted readings are randomly ordered measurements for different devices in the zone. You need to take the mix of readings and group these by device, so the weather data is easier to consume by downstream dashboards and applications.

> _This example's pipeline relies on some of the more difficult to understand array operator expressions, like [`$map`](https://docs.mongodb.com/manual/reference/operator/aggregation/map/), [`$mergeObjects`](https://docs.mongodb.com/manual/reference/operator/aggregation/mergeObjects/) and [`$filter`](https://docs.mongodb.com/manual/reference/operator/aggregation/filter/). Consequently, ensure you have digested the [Advanced Use Of Expressions For Array Processing](../../guides/advanced-arrays.md) chapter first, which explains how to use these operators. The pipeline also uses the [`$setUnion`](https://docs.mongodb.com/manual/reference/operator/aggregation/setUnion/) operator for finding unique values in an array. The _Observations_ part of this chapter explains this in more detail._


## Sample Data Population

Drop any old version of the database (if it exists) and then populate new hourly weather station measurements collection:

```javascript
use book-pivot-array-by-key;
db.dropDatabase();

// Inserts records into the weather_measurements collection
db.weather_measurements.insertMany([
  {
    "weatherStationsZone": "FieldZone-ABCD",
    "dayHour": ISODate("2021-07-05T15:00:00.000Z"),
    "readings": [
      {"device": "ABCD-Device-123", "tempCelsius": 18},        
      {"device": "ABCD-Device-789", "pressureMBar": 1004},        
      {"device": "ABCD-Device-123", "humidityPercent": 31},        
      {"device": "ABCD-Device-123", "tempCelsius": 19},        
      {"device": "ABCD-Device-123", "pressureMBar": 1005},        
      {"device": "ABCD-Device-789", "humidityPercent": 31},        
      {"device": "ABCD-Device-123", "humidityPercent": 30},        
      {"device": "ABCD-Device-789", "tempCelsius": 20},        
      {"device": "ABCD-Device-789", "pressureMBar": 1003},        
    ],
  },
  {
    "weatherStationsZone": "FieldZone-ABCD",
    "dayHour": ISODate("2021-07-05T16:00:00.000Z"),
    "readings": [
      {"device": "ABCD-Device-789", "humidityPercent": 33},        
      {"device": "ABCD-Device-123", "humidityPercent": 32},        
      {"device": "ABCD-Device-123", "tempCelsius": 22},        
      {"device": "ABCD-Device-123", "pressureMBar": 1007},        
      {"device": "ABCD-Device-789", "pressureMBar": 1008},        
      {"device": "ABCD-Device-789", "tempCelsius": 22},        
      {"device": "ABCD-Device-789", "humidityPercent": 34},        
    ],
  },
]);
```


## Aggregation Pipeline

Define a pipeline ready to perform the aggregation that groups the weather readings by device. 

```javascript
var pipeline = [
  // Loop for each unique device, to accumulate an array of devices and their readings
  {"$set": {
    "readings_device_summary": {
      "$map": {
        "input": {
          "$setUnion": "$readings.device"  // Get only unique device ids from the array
        },
        "as": "device",
        "in": {
          "$mergeObjects": {  // Merge array of key:values elements into single object
            "$filter": {
              "input": "$readings",  // Iterate the "readings" array field
              "as": "reading",  // Name the current array element "reading"
              "cond": {  // Only include device properties matching the current device
                "$eq": ["$$reading.device", "$$device"]
              }
            }
          }
        }
      }
    },
  }},
  
  // Exclude unrequired fields from each record
  {"$unset": [
    "_id",
    "readings",
  ]},  
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.weather_measurements.aggregate(pipeline);
```

```javascript
db.weather_measurements.explain("executionStats").aggregate(pipeline);
```


## Expected Results

Two documents should be returned, with the weather station hourly records containing a new array field of elements representing each device and its measurements, as shown below:

```javascript
[
  {
    weatherStationsZone: 'FieldZone-ABCD',
    dayHour: ISODate("2021-07-05T15:00:00.000Z"),
    readings_device_summary: [
      {
        device: 'ABCD-Device-123',
        tempCelsius: 19,
        humidityPercent: 30,
        pressureMBar: 1005
      },
      {
        device: 'ABCD-Device-789',
        pressureMBar: 1003,
        humidityPercent: 31,
        tempCelsius: 20
      }
    ]
  },
  {
    weatherStationsZone: 'FieldZone-ABCD',
    dayHour: ISODate("2021-07-05T16:00:00.000Z"),
    readings_device_summary: [
      {
        device: 'ABCD-Device-123',
        humidityPercent: 32,
        tempCelsius: 22,
        pressureMBar: 1007
      },
      {
        device: 'ABCD-Device-789',
        humidityPercent: 34,
        pressureMBar: 1008,
        tempCelsius: 22
      }
    ]
  }
]
```


## Observations

 * __Pivoting Items By A Key.__ The pipeline does not use the source array field directly to provide the initial list of items for the `$map` operator to loop through. Instead, it uses the `$setUnion` operator to capture each unique device name from the array of readings. This approach essentially allows you to group subsets of array items by a key. The array processing and grouping work is self-contained within each document for optimum aggregation performance.

 * __Merging Subset Of Array Elements Into One Item.__ For each `$map` iteration, a `$filter` operator collects the subset of readings from the original array which match the unique device's name. The `$mergeObjects` operator then takes this subset of readings and turns it into an object, with the measurement type (e.g. `temperature`) as the key and the measurement (e.g. `21℃`) as the value. Suppose more than one reading of the same type exists for a device (e.g. `temporature=22`, `temperature=23`). In that case, the `$mergeObject` operator retains the last value only (e.g. `23℃`), which is the desired behaviour for this example scenario.

 * __Potentially Adopt A Better Data Model.__ In this example, the weather station hourly data is just persisted directly into the database in the exact structure that the system receives it. However, if it is possible for you to take control of exactly what structure you persist the data in initially, you should take this opportunity. You want to land the data in the database using a model that lends itself to the optimum way for consuming applications to access it. For the Internet of Things (IoT) type uses case, where time-series data is collected and then analysed downstream, you should be adopting the [Bucketing pattern](https://www.mongodb.com/blog/post/building-with-patterns-the-bucket-pattern). However, if you are fortunate enough to be using MongoDB version 5.0 or greater, you can instead use MongoDB's _time series_ collection feature. This particular type of collection efficiently stores sequences of measurements over time to improve subsequent query efficiency. It automatically adopts a _bucketing pattern_ internally, meaning that you don't have to design your data model for this explicitly.

