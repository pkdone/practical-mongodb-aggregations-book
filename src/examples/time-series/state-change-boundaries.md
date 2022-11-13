# State Change Boundaries

__Minimum MongoDB Version:__ 5.0 &nbsp;&nbsp; _(due to use of [time series collections](https://docs.mongodb.com/manual/core/timeseries-collections/), [`$setWindowFields`](https://docs.mongodb.com/manual/reference/operator/aggregation/setWindowFields/) stage & [`$shift`](https://docs.mongodb.com/manual/reference/operator/aggregation/shift/) operator)_


## Scenario

You TODO.


## Sample Data Population

Drop any old version of the database (if it exists) and then populate the device status documents:

```javascript
use('book-state-change-boundaries');
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

Define a pipeline ready to perform an aggregation to TODO:

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

  // Use current record's timestamp as "startTimestamp" only if state changed from previous record
  // in series, and only set "endMarkerDate" to current record's timestamp if the state changes
  // between current and next records in the series
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
  
  // Only keep records where state has just changed or is just about to change (so mostly
  // start/end pairs, but not always if the state change only lasted on record)
  {"$match": {
    "$expr": {
      "$or": [     
        {"$ne": ["$state", "$previousState"]},
        {"$ne": ["$state", "$nextState"]},
      ]
    }
  }},    
  
  // Set "nextMarkerDate" to the timestamp of the next record in the series (will be set to 'null'
  // if no next record to indicate 'unbounded')
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

  // Only keep records at the start of the state change boundaries (throw away matching pair end
  // records, if any)
  {"$match": {
    "$expr": {
      "$ne": ["$state", "$previousState"],
    }
  }},
    
  // If no boundary after this record (it's the last matching record in the series), set
  //  "endTimestamp" as unbounded (null)
  // Otherwise, if this start boundary record was also an end boundary record (it was not paired -
  //  it was only one record before state changed), set "endTimestamp" to this known end timestamp
  // Otherwise, set "endTimestamp" to what was the captured timestamp from the original matching
  //  pair in the series (where the end paired record has since has been removed)
  {"$set": {
    "endTimestamp" : {
      "$switch": {
        "branches": [
          {"case": {"$eq": [{"$type": "$nextMarkerDate"}, "null"]}, "then": null},  // unbounded (so no final timestamp in series)
          {"case": {"$ne": [{"$type": "$endMarkerDate"}, "missing"]}, "then": "$endMarkerDate"},  // timestamp from what was same end record as start record 
        ],
        "default": "$nextMarkerDate",  // timestamp from what was an end record paired with a separate start record
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

TODO documents should be returned, TODO, as shown below:

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

 * __Todo.__ TODO.

