# Stages Cheatsheet Source

To test all the aggregation stage examples shown in the [Cheatsheet](cheatsheet.html), run the following JavaScript from the MongoDB Shell connected to a MongoDB database.

## Collections Configuration & Data Population

```javascript
// DB configuration
use cheatsheet;
db.dropDatabase();
db.places.createIndex({"loc": "2dsphere"});

// 'shapes' collection
db.shapes.insertMany([
  {"_id": "◐", "x": "■", "y": "▲", "val": 10, "ord": 0},
  {"_id": "◑", "x": "■", "y": "■", "val": 60},
  {"_id": "◒", "x": "●", "y": "■", "val": 80},
  {"_id": "◓", "x": "▲", "y": "▲", "val": 85},
  {"_id": "◔", "x": "■", "y": "▲", "val": 90},
  {"_id": "◕", "x": "●", "y": "■", "val": 95, "ord": 100},
]);

// 'lists' collection
db.lists.insertMany([
  {"_id": "▤", "a": "●", "b": ["◰", "◱"]},
  {"_id": "▥", "a": "▲", "b": ["◲"]},
  {"_id": "▦", "a": "▲", "b": ["◰", "◳", "◱"]},
  {"_id": "▧", "a": "●", "b": ["◰"]},
  {"_id": "▨", "a": "■", "b": ["◳", "◱"]},
]);

// 'places' collection
db.places.insertMany([
  {"_id": "Bigtown", "loc": {"type": "Point", "coordinates": [1,1]}},
  {"_id": "Smalltown", "loc": {"type": "Point", "coordinates": [3,3]}},
  {"_id": "Happytown", "loc": {"type": "Point", "coordinates": [5,5]}},
  {"_id": "Sadtown", "loc": {"type": "LineString", "coordinates": [[7,7],[8,8]]}},
]);
```


## Aggregation Stage Examples

> _If you are running a MongoDB version earlier than 6.0, and if you have not configured an [Atlas Search index](#configuring-the-required-atlas-search-index), some of the unsupported stages in the code you execute below will show an error or empty result. A code comment marks each stage with the minimum required MongoDB version and if it mandates an Atlas Search index._

```javascript
// $addFields  (v3.4)
db.shapes.aggregate([
  {"$addFields": {"z": "●"}}
]);


// $bucket  (v3.4)
db.shapes.aggregate([
  {"$bucket": {
    "groupBy": "$val", "boundaries": [0, 25, 50, 75, 100], "default": "Other"
  }}
]);


// $bucketAuto  (v3.4)
db.shapes.aggregate([
  {"$bucketAuto": {"groupBy": "$val", "buckets": 3}}
]);


// $count  (v3.4)
db.shapes.aggregate([
  {"$count": "amount"}
]);


// $densify  (v5.1)
db.shapes.aggregate([
  {"$densify": {
    "field": "val", 
    "partitionByFields": ["x"], 
    "range": {"bounds": "full", "step": 25}
  }}
]);


// $documents  (v5.1)
db.aggregate([
  {"$documents": [
    {"p": "▭", "q": "▯"},
    {"p": "▯", "q": "▭"},
  ]}
]);


// $facet  (v3.4)
db.shapes.aggregate([
  {"$facet": {
    "X_CIRCLE_FACET": [{"$match": {"x": "●"}}],
    "FIRST_TWO_FACET" : [{"$limit": 2}],
  }}
]);


// $fill  (v5.3)
db.shapes.aggregate([
  {"$fill": {
    "sortBy": {"val": 1},        
    "output": {
      "ord": {"method": "linear"}
    }
  }}
]);


// $geoNear  (v2.2)
db.places.aggregate([
  {"$geoNear": {
    "near": {"type": "Point", "coordinates": [9,9]}, "distanceField": "distance"
  }}
]);


// $graphLookup  (v3.4)
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


// $group  (v2.2)
db.shapes.aggregate([
  {"$group": {"_id": "$x", "ylist": {"$push": "$y"}}}
]);


// $limit  (v2.2)
db.shapes.aggregate([
  {"$limit": 2}
]);


// $lookup  (v3.2)
db.shapes.aggregate([
  {"$lookup": {
    "from": "lists",
    "localField": "y",
    "foreignField": "a",
    "as": "refs",
  }}
]);


// $match  (v2.2)
db.shapes.aggregate([
  {"$match": {"y": "▲"}  
}]);


// $merge  (v4.2)
db.results.drop();
db.shapes.aggregate([
  {"$merge": {"into": "results"}}
]);
db.results.find();


// $out  (v2.6)
db.results.drop();
db.shapes.aggregate([
  {"$out": "results"}
]);
db.results.find();


// $project  (v2.2)
db.shapes.aggregate([
  {"$project": {"x": 1}}
]);


// $redact  (v2.6)
db.places.aggregate([
  {"$redact": {"$cond": {
    "if"  : {"$eq": ["$type", "LineString"]},
    "then": "$$PRUNE",
    "else": "$$DESCEND"
  }}}
]);


// $replaceRoot  (v3.4)
db.lists.aggregate([
  {"$replaceRoot": {"newRoot": {"first": {"$first": "$b"}, "last": {"$last": "$b"}}}}
]);


// $replaceWith  (v4.2)
db.lists.aggregate([
  {"$replaceWith": {"first": {"$first": "$b"}, "last": {"$last": "$b"}}}
]);


// $sample  (v3.2)
db.shapes.aggregate([
  {"$sample": {"size": 3}}
]);


// $search  (v4.2 - requires an Atlas Search index)
db.places.aggregate([
  {"$search": {
    "text": {
      "path": "_id",
      "query": "Bigtown Happytown",
    }
  }}
]);


// $search  (v4.2 - requires an Atlas Search index)
db.places.aggregate([
  {"$searchMeta": {
   "facet": {
      "operator": {
        "exists": {
          "path": "_id"
        }      
      },   
      "facets": {        
        "geotypes": {
          "type" : "string",
          "path" : "loc.type",
          "numBuckets" : 2,
        }            
      }        
    }             
  }}
]);


// $set  (v4.2)
db.shapes.aggregate([
  {"$set": {"y": "▲"}}
]);


// $setWindowFields  (v5.0)
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


// $skip  (v2.2)
db.shapes.aggregate([
  {"$skip": 5}
]);


// $sort  (v2.2)
db.shapes.aggregate([
  {"$sort": {"x": 1, "y": 1}}
]);


// $sortByCount  (v3.4)
db.shapes.aggregate([
  {"$sortByCount": "$x"}
]);


// $unionWith  (v4.4)
db.shapes.aggregate([
  {"$unionWith": {"coll": "lists"}}
]);


// $unset  (v4.2)
db.shapes.aggregate([
  {"$unset": ["x"]}
]);


// $unwind  (v2.2)
db.lists.aggregate([
  {"$unwind": {"path": "$b"}}
]);
```


## Configuring The Required Atlas Search Index

The `$search` and `$searchMeta` stages require that you first configure an [Atlas Search](https://www.mongodb.com/docs/atlas/atlas-search/atlas-search-overview/) index. Follow the procedure described in the [Create Atlas Search Index](./create-search-index.md) appendix to define a **Search Index** for the collection **cheatsheet.places**, with the following JSON rule:

```javascript
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "loc": {
        "fields": {
          "type": {
            "type": "stringFacet"
          }
        },
        "type": "document"
      }
    }
  }
}
```

