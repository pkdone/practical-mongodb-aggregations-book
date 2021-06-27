# Stages Cheatsheet Source

To test all the aggregation stage examples shown in the [Cheatsheet](cheatsheet.html), run the following JavaScript from a MongoDB Shell connected to a MongoDB database.

## Collection Configuration & Data Population

```javascript
// DB configuration
use cheatsheet;
db.dropDatabase();
db.places.createIndex({loc: "2dsphere"});

// 'shapes' collection
db.shapes.insertMany([
  {_id: "◐", x: "■", y: "▲", val: 11},
  {_id: "◑", x: "■", y: "■", val: 74},
  {_id: "◒", x: "●", y: "■", val: 79},
  {_id: "◓", x: "▲", y: "▲", val: 81},
  {_id: "◔", x: "■", y: "▲", val: 83},
  {_id: "◕", x: "●", y: "■", val: 85},
]);

// 'lists' collection
db.lists.insertMany([
  {_id: "▤", a: "●", b: ["◰", "◱"]},
  {_id: "▥", a: "▲", b: ["◲"]},
  {_id: "▦", a: "▲", b: ["◰", "◳", "◱"]},
  {_id: "▧", a: "●", b: ["◰"]},
  {_id: "▨", a: "■", b: ["◳", "◱"]},
]);

// 'places' collection
db.places.insertMany([
  {_id: "◧", loc: {type: "Point", coordinates: [1,1]}},
  {_id: "◨", loc: {type: "Point", coordinates: [3,3]}},
  {_id: "◩", loc: {type: "Point", coordinates: [5,5]}},
  {_id: "◪", loc: {type: "LineString", coordinates: [[7,7],[8,8]]}},
]);
```


## Aggregation Stage Examples

```javascript
// $addFields
db.shapes.aggregate([
  {"$addFields": {"z": "●"}}
]);


// $bucket
db.shapes.aggregate([
  {"$bucket": {
    "groupBy": "$val", "boundaries": [0, 25, 50, 75, 100], "default": "Other"
  }}
]);


// $bucketAuto
db.shapes.aggregate([
  {"$bucketAuto": {"groupBy": "$val", "buckets": 3}}
]);


// $count
db.shapes.aggregate([
  {"$count": "amount"}
]);


// $facet
db.shapes.aggregate([
  {"$facet": {
    "X_CIRCLE_FACET": [{"$match": {"x": "●"}}],
    "FIRST_TWO_FACET" : [{"$limit": 2}],
  }}
]);


// $geoNear
db.places.aggregate([
  {"$geoNear": {
    "near": {"type": "Point", "coordinates": [9,9]}, "distanceField": "distance"
  }}
]);


// $graphLookup
db.shapes.aggregate([
  {"$graphLookup": {
    "from": "shapes",
    "startWith": "$x",
    "connectFromField": "x",
    "connectToField": "y",
    "depthField": "depth",
    "as": "connections",
  }},
  {$project: {"connections_count": {"$size": "$connections"}}}
]);


// $group
db.shapes.aggregate([
  {"$group": {"_id": "$x", "ylist": {"$push": "$y"}}}
]);


// $limit
db.shapes.aggregate([
  {"$limit": 2}
]);


// $lookup
db.shapes.aggregate([
  {"$lookup": {
    "from": "lists",
    "localField": "y",
    "foreignField": "a",
    "as": "refs",
  }}
]);


// $match
db.shapes.aggregate([
  {"$match": {"y": "▲"}  
}]);


// $merge
db.results.drop();
db.shapes.aggregate([
  {"$merge": {"into": "results"}}
]);
db.results.find();


// $out
db.results.drop();
db.shapes.aggregate([
  {"$out": "results"}
]);
db.results.find();


// $project
db.shapes.aggregate([
  {"$project": {"x": 1}}
]);


// $redact
db.places.aggregate([
  {"$redact": {"$cond": {
    "if"  : {"$eq": ["$type", "LineString"]},
    "then": "$$PRUNE",
    "else": "$$DESCEND"
  }}}
]);


// $replaceRoot
db.lists.aggregate([
  {"$replaceRoot": {"newRoot": {"first": {"$first": "$b"}, "last": {"$last": "$b"}}}}
]);


// $replaceWith
db.lists.aggregate([
  {"$replaceWith": {"first": {"$first": "$b"}, "last": {"$last": "$b"}}}
]);


// $sample
db.shapes.aggregate([
  {"$sample": {"size": 2}}
]);


// $set
db.shapes.aggregate([
  {"$set": {"y": "▲"}}
]);


// $setWindowFields
db.shapes.aggregate([
  {"$setWindowFields": {
    "partitionBy": "$x",
    "sortBy": {"_id": 1},    
    "output": {
      "cumulativeValShapeX": {
        "$sum": "$val",
        "window": {
          "documents": ["unbounded", "current"]
        }
      }
    }
  }}
]);


// $skip
db.shapes.aggregate([
  {"$skip": 5}
]);


// $sort
db.shapes.aggregate([
  {"$sort": {"x": 1, "y": 1}}
]);


// $sortByCount
db.shapes.aggregate([
  {"$sortByCount": "$x"}
]);


// $unionWith
db.shapes.aggregate([
  {"$unionWith": {"coll": "lists"}}
]);


// $unset
db.shapes.aggregate([
  {"$unset": ["x"]}
]);


// $unwind
db.lists.aggregate([
  {"$unwind": {"path": "$b"}}
]);
```

