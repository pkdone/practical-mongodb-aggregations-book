# State Change Boundaries

__Minimum MongoDB Version:__ 5.0 &nbsp;&nbsp; _(due to use of [time series collections](https://docs.mongodb.com/manual/core/timeseries-collections/), [`$setWindowFields`](https://docs.mongodb.com/manual/reference/operator/aggregation/setWindowFields/) stage & [`$shift`](https://docs.mongodb.com/manual/reference/operator/aggregation/shift/) operator)_


## Scenario

You are monitoring various industrial devices (e.g. heaters, fans) contained in the business locations of your clients. You want to understand the typical patterns of when these devices are on and off to help you optimise for sustainability, carbon footprint reduction, and lowering energy costs. The source database contains periodic readings for every device, capturing whether each is currently on or off. You need a less verbose view that condenses this data, highlighting each device's periods when it is on and off.


## Sample Data Population

Drop any old version of the database (if it exists) and then populate the device status documents:

```javascript
use book-state-change-boundaries;
db.dropDatabase();

// Create compound index for 'partitionBy' & 'sortBy' in first $setWindowFields use
db.device_status.createIndex({"deviceID": 1, "timestamp": 1});

// Insert 9 records into the deployments collection
db.device_status.insertMany([
  {
    "deviceID": "HEATER-111",    
    "timestamp": ISODate("2021-07-03T11:09:00Z"),
    "state": "on",     
  },
  {
    "deviceID": "FAN-999",    
    "timestamp": ISODate("2021-07-03T11:09:00Z"),
    "state": "on",     
  },
  {
    "deviceID": "HEATER-111",    
    "timestamp": ISODate("2021-07-03T11:19:00Z"),
    "state": "on",     
  },
  {
    "deviceID": "HEATER-111",    
    "timestamp": ISODate("2021-07-03T11:29:00Z"),
    "state": "on",     
  },
  {
    "deviceID": "FAN-999",    
    "timestamp": ISODate("2021-07-03T11:39:00Z"),
    "state": "off",     
  },
  {
    "deviceID": "HEATER-111",    
    "timestamp": ISODate("2021-07-03T11:39:00Z"),
    "state": "off",     
  },
  {
    "deviceID": "HEATER-111",    
    "timestamp": ISODate("2021-07-03T11:49:00Z"),
    "state": "off",     
  },
  {
    "deviceID": "HEATER-111",    
    "timestamp": ISODate("2021-07-03T11:59:00Z"),
    "state": "on",     
  },
  {
    "deviceID": "DEHUMIDIFIER-555",    
    "timestamp": ISODate("2021-07-03T11:29:00Z"),
    "state": "on",     
  },
]);
```


## Aggregation Pipeline

Define a pipeline ready to perform an aggregation:

```javascript
var pipeline = [
  // Capture previous and next records' state into new fields in this current record
  {"$setWindowFields": {
    "partitionBy": "$deviceID",
    "sortBy": {"timestamp": 1},    
    "output": {
      "previousState": {
        "$shift": {
          "output": "$state",
          "by": -1,
        }
      },
      "nextState": {
        "$shift": {
          "output": "$state",
          "by": 1,
        }
      },
    }
  }},

  // Use current record's timestamp as "startTimestamp" only if state changed from
  // previous record in series, and only set "endMarkerDate" to current record's
  // timestamp if the state changes between current and next records in the series
  {"$set": {
    "startTimestamp" : {
      "$cond": [
        {"$eq": ["$state", "$previousState"]}, 
        "$$REMOVE",
        "$timestamp",
      ]    
    },
    "endMarkerDate" : {
      "$cond": [
        {"$eq": ["$state", "$nextState"]}, 
        "$$REMOVE",
        "$timestamp",
      ]    
    },
  }},
  
  // Only keep records where state has just changed or is just about to change (so
  // mostly start/end pairs, but not always if state change only lasted one record)
  {"$match": {
    "$expr": {
      "$or": [     
        {"$ne": ["$state", "$previousState"]},
        {"$ne": ["$state", "$nextState"]},
      ]
    }
  }},    
  
  // Set "nextMarkerDate" to the timestamp of the next record in the series (will
  // be set to 'null' if no next record to indicate 'unbounded')
  {"$setWindowFields": {
    "partitionBy": "$deviceID",
    "sortBy": {"timestamp": 1},    
    "output": {
      "nextMarkerDate": {
        "$shift": {
          "output": "$timestamp",
          "by": 1,
        }
      },
    }
  }},  

  // Only keep records at the start of the state change boundaries (throw away
  // matching pair end records, if any)
  {"$match": {
    "$expr": {
      "$ne": ["$state", "$previousState"],
    }
  }},
    
  // If no boundary after this record (it's the last matching record in the series),
  // set "endTimestamp" as unbounded (null)
  // Otherwise, if this start boundary record was also an end boundary record (not
  //  paired - only 1 record before state changed), set "endTimestamp" to end timestamp
  // Otherwise, set "endTimestamp" to what was the captured timestamp from the original
  //  matching pair in the series (where the end paired record has since been removed)
  {"$set": {
    "endTimestamp" : {
      "$switch": {
        "branches": [
          // Unbounded, so no final timestamp in series
          {"case": {"$eq": [{"$type": "$nextMarkerDate"}, "null"]}, "then": null},  
          // Use end timestamp from what was same end record as start record 
          {"case": {"$ne": [{"$type": "$endMarkerDate"}, "missing"]}, "then": "$endMarkerDate"},  
        ],
        // Use timestamp from what was an end record paired with separate start record
        "default": "$nextMarkerDate",  
      }
    },   
  }},

  // Remove unwanted fields from the final result
  {"$unset": [
    "_id",
    "timestamp",
    "previousState",
    "nextState",
    "endMarkerDate",
    "nextMarkerDate",
  ]}
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.device_status.aggregate(pipeline);
```

```javascript
db.device_status.explain("executionStats").aggregate(pipeline);
```


## Expected Results

Six documents should be returned, each of which captures the duration between two state change boundaries (`on→off` or `off→on`) for a device, as shown below:

```javascript
[
  {
    deviceID: 'DEHUMIDIFIER-555',
    state: 'on',
    startTimestamp: ISODate("2021-07-03T11:29:00.000Z"),
    endTimestamp: null
  },
  {
    deviceID: 'FAN-999',
    state: 'on',
    startTimestamp: ISODate("2021-07-03T11:09:00.000Z"),
    endTimestamp: ISODate("2021-07-03T11:09:00.000Z")
  },
  {
    deviceID: 'FAN-999',
    state: 'off',
    startTimestamp: ISODate("2021-07-03T11:39:00.000Z"),
    endTimestamp: null
  },
  {
    deviceID: 'HEATER-111',
    state: 'on',
    startTimestamp: ISODate("2021-07-03T11:09:00.000Z"),
    endTimestamp: ISODate("2021-07-03T11:29:00.000Z")
  },
  {
    deviceID: 'HEATER-111',
    state: 'off',
    startTimestamp: ISODate("2021-07-03T11:39:00.000Z"),
    endTimestamp: ISODate("2021-07-03T11:49:00.000Z")
  },
  {
    deviceID: 'HEATER-111',
    state: 'on',
    startTimestamp: ISODate("2021-07-03T11:59:00.000Z"),
    endTimestamp: null
  }
]
```


## Observations

 * __Null End Timestamps.__ The last record for each specific device has the value of its `endTimestamp` field set to `null`. The null value means no end date and time exists for the device's last on/off state. It indicates that the record shows the final known state of the device.

 * __Peeking At One Document From Another.__ By using the windowing stage (`$setWindowFields`) you can apply aggregation operations that span multiple documents. Combined with its shift operator (`$shift`), in an aggregation pipeline, you can peek at the content of preceding or following documents and bring some of that other document's content into the current document. In this example, you are bringing the device's state from the previous document (`-1` offset) and the next document (`+1` offset) into the current document. Capturing these adjacent values enables subsequent stages in your pipeline to determine if the current device has changed state. Using `$shift` relies on the documents already being partitioned (e.g. by device ID) and sorted (e.g. by timestamp), which the containing `$setWindowFields` is enforcing.

 * __Double Use Of A Windowing Stage.__ The pipeline's first windowing stage and the subsequent matching stage capture device documents where the device's state has changed from `on` to `off` or vice versa. In many cases, this results in adjacent pairs of documents where the first document in the pair captures the first time the device has a new state, and the second document captures the last time it was in that same state. The example's pipeline requires a later second window stage to condense each pair of 'boundary' documents into one document. This second windowing stage again uses a shift operator to bring the timestamp of the pair's second document into a new field in the pair's first document. Consequently, single documents now exist which contain both the start and end timestamps of a particular device's state. Finally, the pipeline employs further logic to clean things up because, in some situations, there won't be a pair of related documents. For example, if a device's recorded state changes and immediately changes again, or it's the last time a device's state is captured, there will be no paired document marking the end state.

