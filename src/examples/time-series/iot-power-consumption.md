# IOT Power Consumption

__Minimum MongoDB Version:__ 5.0 &nbsp;&nbsp; _(due to use of $setWindowFields stage & $integral operator)_


## Scenario

You are monitoring various Wi-Fi Hub devices running in two buildings on an industrial campus. Every 30 seconds, each device sends its current power consumption back to base, which a central database persists. You want to analyse this data to see how much energy (in Watt-hours - _Wh_) a device has consumed over the last hour for each device reading received. Furthermore, you then want to compute the total energy consumed by all the devices combined in each building for every hour.

## Sample Data Population

Drop any old version of the database (if it exists) and then populate a new `device_readings` collection with device readings spanning 4 hours of a day for devices in two different buildings.

```javascript
use book-iot-power-consumption;
db.dropDatabase();

// Create compount index to support the partitionBy & sortBy of setWindowFields
db.device_readings.createIndex({"deviceID": 1, "timestamp": 1});

// Insert 24 records into the device readings collection
db.device_readings.insertMany([
  // 11:29am sensor readings
  {
    "buildingID": "Building-ABC", 
    "deviceID": "WifiHub-111",    
    "timestamp": ISODate("2021-07-03T11:29:00Z"),
    "powerWatts": 8,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-222",    
    "timestamp": ISODate("2021-07-03T11:29:00Z"),
    "powerWatts": 7,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "WifiHub-666",    
    "timestamp": ISODate("2021-07-03T11:29:00Z"),
    "powerWatts": 10,     
  },
  
  // 11:59am sensor readings
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-222",    
    "timestamp": ISODate("2021-07-03T11:59:00Z"),
    "powerWatts": 9,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-111",    
    "timestamp": ISODate("2021-07-03T11:59:00Z"),
    "powerWatts": 8,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "WifiHub-666",    
    "timestamp": ISODate("2021-07-03T11:59:00Z"),
    "powerWatts": 11,     
  },
  
  // 12:29pm sensor readings
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-222",    
    "timestamp": ISODate("2021-07-03T12:29:00Z"),
    "powerWatts": 9,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-111",    
    "timestamp": ISODate("2021-07-03T12:29:00Z"),
    "powerWatts": 9,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "WifiHub-666",    
    "timestamp": ISODate("2021-07-03T12:29:00Z"),
    "powerWatts": 10,     
  },

  // 12:59pm sensor readings
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-222",    
    "timestamp": ISODate("2021-07-03T12:59:00Z"),
    "powerWatts": 8,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-111",    
    "timestamp": ISODate("2021-07-03T12:59:00Z"),
    "powerWatts": 8,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "WifiHub-666",    
    "timestamp": ISODate("2021-07-03T12:59:00Z"),
    "powerWatts": 11,     
  },

  // 13:29pm sensor readings
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-222",    
    "timestamp": ISODate("2021-07-03T13:29:00Z"),
    "powerWatts": 9,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-111",    
    "timestamp": ISODate("2021-07-03T13:29:00Z"),
    "powerWatts": 9,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "WifiHub-666",    
    "timestamp": ISODate("2021-07-03T13:29:00Z"),
    "powerWatts": 10,     
  },

  // 13:59pm sensor readings
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-222",    
    "timestamp": ISODate("2021-07-03T13:59:00Z"),
    "powerWatts": 8,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-111",    
    "timestamp": ISODate("2021-07-03T13:59:00Z"),
    "powerWatts": 8,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "WifiHub-666",    
    "timestamp": ISODate("2021-07-03T13:59:00Z"),
    "powerWatts": 11,     
  },

  // 14:29pm sensor readings
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-222",    
    "timestamp": ISODate("2021-07-03T14:29:00Z"),
    "powerWatts": 10,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-111",    
    "timestamp": ISODate("2021-07-03T14:29:00Z"),
    "powerWatts": 9,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "WifiHub-666",    
    "timestamp": ISODate("2021-07-03T14:29:00Z"),
    "powerWatts": 11,     
  },

  // 14:59pm sensor readings
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-222",    
    "timestamp": ISODate("2021-07-03T14:59:00Z"),
    "powerWatts": 9,     
  },
  {
    "buildingID": "Building-ABC",
    "deviceID": "WifiHub-111",    
    "timestamp": ISODate("2021-07-03T14:59:00Z"),
    "powerWatts": 10,     
  },
  {
    "buildingID": "Building-XYZ",
    "deviceID": "WifiHub-666",    
    "timestamp": ISODate("2021-07-03T14:59:00Z"),
    "powerWatts": 12,     
  },
]);
```


## Aggregation Pipeline

Define a pipeline ready to perform an aggregation to calculate the energy a device has consumed over the last hour for each reading received:

```javascript
var pipelineRawReadings = [
  // Calculate each device's energy consumed over the last hour for each raading
  {"$setWindowFields": {
    "partitionBy": "$deviceID",
    "sortBy": {"timestamp": 1},    
    "output": {
      "consumedWattHours": {
        "$integral": {
          "input": "$powerWatts",
          "outputUnit": "hour",
        },
        "window": {
          "range": [-1, "current"],
          "unit": "hour",
        },
      },
    },
  }},
];
```

Define a pipeline ready to compute the total energy consumed by all the devices combined in each building for every hour:

```javascript
var pipelineBuildingsSummary = [
  // Calculate each device's energy consumed over the last hour for each raading
  {"$setWindowFields": {
    "partitionBy": "$deviceID",
    "sortBy": {"timestamp": 1},    
    "output": {
      "consumedWattHours": {
        "$integral": {
          "input": "$powerWatts",
          "outputUnit": "hour",
        },
        "window": {
          "range": [-1, "current"],
          "unit": "hour",
        },
      },
    },
  }},
  
  // Sort each reading by device and then by timestamp
  {"$sort": {
    "deviceID": 1,
    "timestamp": 1,
  }},    
  
  // Group readings together for each hour for each device using
  // the last calculated energy consumption field for each hour
  {"$group": {
    "_id": {
      "deviceID": "$deviceID",
      "date": {
          "$dateTrunc": {
            "date": "$timestamp",
            "unit": "hour",
          }
      },
    },
    "buildingID": {"$last": "$buildingID"},
    "consumedWattHours": {"$last": "$consumedWattHours"},
  }},    

  // Sum together the energy consumption for the whole building
  // for each hour accross all the devices in the building   
  {"$group": {
    "_id": {
      "buildingID": "$buildingID",
      "dayHour": {"$dateToString": {"format": "%Y-%m-%d: %H", "date": "$_id.date"}},
    },
    "consumedWattHours": {"$sum": "$consumedWattHours"},
  }},    

  // Sort the results by each building and then by each hourly summary
  {"$sort": {
    "_id.buildingID": 1,
    "_id.dayHour": 1,
  }},    

  // Make the results more presentable with meaningful field names
  {"$set": {
    "buildingID": "$_id.buildingID",
    "dayHour": "$_id.dayHour",
    "_id": "$$REMOVE",
  }},      
];
```


## Execution

Execute an aggregation using the pipeline to calculate the energy a device has consumed over the last hour for each reading received and also view its explain plan:

```javascript
db.device_readings.aggregate(pipelineRawReadings);
```

```javascript
db.device_readings.explain("executionStats").aggregate(pipelineRawReadings);
```

Execute an aggregation using the pipeline to compute the total energy consumed by all the devices combined in each building for every hour and also view its explain plan:

```javascript
db.device_readings.aggregate(pipelineBuildingsSummary);
```

```javascript
db.device_readings.explain("executionStats").aggregate(pipelineBuildingsSummary);
```

## Expected Results

For the pipeline to calculate the energy a device has consumed over the last hour for each reading received, results like the following should be returned (redacted for brevity - only showing the first few records):

```javascript
[
  {
    _id: ObjectId("60e203791fa2582f9d8cf830"),
    buildingID: 'Building-ABC',
    deviceID: 'WifiHub-111',
    timestamp: ISODate("2021-07-03T11:29:00.000Z"),
    powerWatts: 8,
    consumedWattHours: 0
  },
  {
    _id: ObjectId("60e203791fa2582f9d8cf834"),
    buildingID: 'Building-ABC',
    deviceID: 'WifiHub-111',
    timestamp: ISODate("2021-07-03T11:59:00.000Z"),
    powerWatts: 8,
    consumedWattHours: 4
  },
  {
    _id: ObjectId("60e203791fa2582f9d8cf837"),
    buildingID: 'Building-ABC',
    deviceID: 'WifiHub-111',
    timestamp: ISODate("2021-07-03T12:29:00.000Z"),
    powerWatts: 9,
    consumedWattHours: 8.25
  },
  {
    _id: ObjectId("60e203791fa2582f9d8cf83a"),
    buildingID: 'Building-ABC',
    deviceID: 'WifiHub-111',
    timestamp: ISODate("2021-07-03T12:59:00.000Z"),
    powerWatts: 8,
    consumedWattHours: 8.5
  },
  {
    _id: ObjectId("60e203791fa2582f9d8cf83d"),
    buildingID: 'Building-ABC',
    deviceID: 'WifiHub-111',
    timestamp: ISODate("2021-07-03T13:29:00.000Z"),
    powerWatts: 9,
    consumedWattHours: 8.5
  },
  {
    _id: ObjectId("60e203791fa2582f9d8cf840"),
    buildingID: 'Building-ABC',
    deviceID: 'WifiHub-111',
    timestamp: ISODate("2021-07-03T13:59:00.000Z"),
    powerWatts: 8,
    consumedWattHours: 8.5
  },
  ...
  ...
]
```

For the pipeline to compute the total energy consumed by all the devices combined in each building for every hour, the following results should be returned:

```javascript
[
  {
    buildingID: 'Building-ABC',
    dayHour: '2021-07-03: 11',
    consumedWattHours: 8
  },
  {
    buildingID: 'Building-ABC',
    dayHour: '2021-07-03: 12',
    consumedWattHours: 17.25
  },
  {
    buildingID: 'Building-ABC',
    dayHour: '2021-07-03: 13',
    consumedWattHours: 17
  },
  {
    buildingID: 'Building-ABC',
    dayHour: '2021-07-03: 14',
    consumedWattHours: 18.25
  },
  {
    buildingID: 'Building-XYZ',
    dayHour: '2021-07-03: 11',
    consumedWattHours: 5.25
  },
  {
    buildingID: 'Building-XYZ',
    dayHour: '2021-07-03: 12',
    consumedWattHours: 10.5
  },
  {
    buildingID: 'Building-XYZ',
    dayHour: '2021-07-03: 13',
    consumedWattHours: 10.5
  },
  {
    buildingID: 'Building-XYZ',
    dayHour: '2021-07-03: 14',
    consumedWattHours: 11.25
  }
]
```


## Observations

 * __Integral Trapezoidal Rule.__ As [documented in the MongoDB Manual](http://todo), `$integral` _"returns an approximation for the mathematical integral value, which is calculated using the trapezoidal rule"_. For the non-mathematicians amongst us, these words can be quite hard to parse, and so it is far better to explain the purpose of the `$integral` operator by using the illustration below:
 
![Example of calculating power consumption by approximating integrals using the trapezoidal rul ](./pics/trapezoidal-rule-example.png)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Essentially the [trapezoidal rule](https://en.wikipedia.org/wiki/Trapezoidal_rule) calculates the area of a region under a graph by matching the region with a trapezoid shape that approximately fits this region and then taking the area of this trapezoid. In the illustration, you can see a set of points on the graph with the approximated trapezoid shape underneath (shown in a peach colour) spanning 1 hour. For this IOT Power Consumption example, the points on the graph represent a device's captured power readings in Watts. The Y-axis is the power rate in Watts, and the X-axis captures the time each reading was taken. Consequently, the energy consumed by the device for a given hour is the area of the hour's specific region under the graph (approximated by a trapezoid). By using the `$integral` operator for the window of time you define in the `$setWindowFields` stage, you are asking for this approximate area, which is the Watt-hours consumed by the device in one hour.

 * __Window Range Definition.__ For every captured document representing a device reading, this example's pipeline identifies a window of _1-hour_ of previous documents, relative to this _current_ document, to be the input for the `$integral` operator. The pipeline defines this in the option `range": [-1, "current"], "unit": "hour"`. The pipeline assigns the output of the `$integral` calculation to a new field called `consumedWattHours`,

 * __Hour Range Vs Hour Units.__ The fact that the `$setWindowFields` stage in the pipeline defines both `"unit": "hour"` and `"outputUnit": "hour"` may appear redundant at face value. However, this is not the case, and each option serves a different purpose. As described in the previous observation, `"unit": "hour"` helps dictate the size of the window of the previous number of documents to analyse. However, the `"outputUnit": "hour"` option defines that the output should be in hours ("Watt-hours" here), yielding the result `consumedWattHours: 8.5` for one of the device readings processed. However, if the pipeline defined this option to be `"outputUnit": "minute"` instead, which is perfectly valid, the output value would be `510` Watt-minutes (i.e. 8.5 x 60 minutes).
 
 * __Index for Partition By & Sort By.__ In this example, you define an index on `{"deviceID": 1, "timestamp": 1}` to support the combination of the `partitionBy` and `sortBy` parameters for the `$setWindowFields` stage. This means that the aggregation runtime does not have to perform a slow in-memory sort based on these two fields, and it avoids the pipeline stage memory limit of 100 MB.
 
