# Stages Cheatsheet

A simple example for each [stage in the MongoDB Aggregation Framework](https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline/). 


#### Stages:

| Query                      | Mutate                                     | Summarise/Itemise                  | Join                               | Output                 |
| :--------------------------| :------------------------------------------| :----------------------------------| :----------------------------------| :----------------------|
| [$geoNear](#stage_geoNear) | [$addFields](#stage_addFields)             | [$bucket](#stage_bucket)           | [$graphLookup](#stage_graphLookup) | [$merge](#stage_merge) |
| [$limit](#stage_limit)     | [$project](#stage_project)                 | [$bucketAuto](#stage_bucketAuto)   | [$lookup](#stage_lookup)           | [$out](#stage_out)     |
| [$match](#stage_match)     | [$redact](#stage_redact)                   | [$count](#stage_count)             | [$unionWith](#stage_unionWith)     |                        |
| [$sample](#stage_sample)   | [$replaceRoot](#stage_replaceRoot)         | [$facet](#stage_facet)             |                                    |                        |
| [$skip](#stage_skip)       | [$replaceWith](#stage_replaceWith)         | [$group](#stage_group)             |                                    |                        |
| [$sort](#stage_sort)       | [$set](#stage_set)                         | [$sortByCount](#stage_sortByCount) |                                    |                        |
|                            | [$setWindowFields](#stage_setWindowFields) | [$unwind](#stage_unwind)           |                                    |                        |
|                            | [$unset](#stage_unset)                     |                                    |                                    |                        |


> Some stages are not included because they are unrelated to aggregating business data or rely on external systems: &nbsp;`$collStats`, `$indexStats`, `$listSessions`, `$planCacheStats`, `$currentOp`, `$listLocalSessions`, `$search`

#### Input Collections:

```javascript
// shapes
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}

// lists
{_id: "▤", a: "●", b: ["◰", "◱"]}
{_id: "▥", a: "▲", b: ["◲"]}
{_id: "▦", a: "▲", b: ["◰", "◳", "◱"]}
{_id: "▧", a: "●", b: ["◰"]}
{_id: "▨", a: "■", b: ["◳", "◱"]}

// places
{_id: "◧", loc: {type: "Point", coordinates: [1,1]}}
{_id: "◨", loc: {type: "Point", coordinates: [3,3]}}
{_id: "◩", loc: {type: "Point", coordinates: [5,5]}}
{_id: "◪", loc: {type: "LineString", coordinates: [[7,7],[8,8]]}}
```

&nbsp;

---

<a name="stage_addFields"></a>
## [$addFields](https://docs.mongodb.com/manual/reference/operator/aggregation/addFields/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$addFields: {z: "●"}      
   ⬇︎      
{_id: '◐', x: '■', y: '▲', val: 11, z: '●'}
{_id: '◑', x: '■', y: '■', val: 74, z: '●'}
{_id: '◒', x: '●', y: '■', val: 79, z: '●'}
{_id: '◓', x: '▲', y: '▲', val: 81, z: '●'}
{_id: '◔', x: '■', y: '▲', val: 83, z: '●'}
{_id: '◕', x: '●', y: '■', val: 85, z: '●'}
```

&nbsp;

---

<a name="stage_bucket"></a>
## [$bucket](https://docs.mongodb.com/manual/reference/operator/aggregation/bucket/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$bucket: {
  groupBy: "$val",
  boundaries: [0, 25, 50, 75, 100],
  default: "Other"
}
   ⬇︎      
{_id: 0, count: 1}
{_id: 50, count: 1}
{_id: 75, count: 4}    
```

&nbsp;

---

<a name="stage_bucketAuto"></a>
## [$bucketAuto](https://docs.mongodb.com/manual/reference/operator/aggregation/bucketAuto/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$bucketAuto: {groupBy: "$val", buckets: 3}
   ⬇︎      
{_id: {min: 11, max: 79}, count: 2}
{_id: {min: 79, max: 83}, count: 2}
{_id: {min: 83, max: 85}, count: 2}   
```

&nbsp;

---

<a name="stage_count"></a>
## [$count](https://docs.mongodb.com/manual/reference/operator/aggregation/count/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$count: "amount"
   ⬇︎      
{amount: 6}    
```

&nbsp;

---

<a name="stage_facet"></a>
## [$facet](https://docs.mongodb.com/manual/reference/operator/aggregation/facet/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$facet: {
  X_CIRCLE_FACET: [{$match: {x: "●"}}],
  FIRST_TWO_FACET: [{$limit: 2}]
}
   ⬇︎      
{
  X_CIRCLE_FACET: [
    {_id: '◒', x: '●', y: '■', val: 79},
    {_id: '◕', x: '●', y: '■', val: 85}
  ],
  FIRST_TWO_FACET: [
    {_id: '◐', x: '■', y: '▲', val: 11},
    {_id: '◑', x: '■', y: '■', val: 74}
  ]
}   
```

&nbsp;

---

<a name="stage_geoNear"></a>
## [$geoNear](https://docs.mongodb.com/manual/reference/operator/aggregation/geoNear/)

```javascript
{_id: "◧", loc: {type: "Point", coordinates: [1,1]}}
{_id: "◨", loc: {type: "Point", coordinates: [3,3]}}
{_id: "◩", loc: {type: "Point", coordinates: [5,5]}}
{_id: "◪", loc: {type: "LineString", coordinates: [[7,7],[8,8]]}}
   ⬇︎      
$geoNear: {
  near: {type: "Point", coordinates: [9,9]}, 
  distanceField: "distance"
}
   ⬇︎      
{_id: '◪', loc: { type: 'LineString', coordinates: [[7,7], [8,8]]}
      distance: 156565.32902203742}
{_id: '◩', loc: { type: 'Point', coordinates: [5,5]}
      distance: 627304.9320885336}
{_id: '◨', loc: { type: 'Point', coordinates: [3,3]}
      distance: 941764.4675092621}
{_id: '◧', loc: { type: 'Point', coordinates: [1,1]}
      distance: 1256510.3666236876}   
```

&nbsp;

---

<a name="stage_graphLookup"></a>
## [$graphLookup](https://docs.mongodb.com/manual/reference/operator/aggregation/graphLookup/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$graphLookup: {
  from: "shapes",
  startWith: "$x",
  connectFromField: "x",
  connectToField: "y",
  depthField: "depth",
  as: "connections"
}
$project: {connections_count: {$size: "$connections"}}
   ⬇︎      
{_id: '◐', connections_count: 3}
{_id: '◑', connections_count: 3}
{_id: '◒', connections_count: 0}
{_id: '◓', connections_count: 6}
{_id: '◔', connections_count: 3}
{_id: '◕', connections_count: 0}
```

&nbsp;

---

<a name="stage_group"></a>
## [$group](https://docs.mongodb.com/manual/reference/operator/aggregation/group/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$group: {_id: "$x", ylist: {$push: "$y"}}
   ⬇︎   
{_id: '●', ylist: ['■', '■']}
{_id: '■', ylist: ['▲', '■', '▲']}
{_id: '▲', ylist: ['▲']}      
```

&nbsp;

---

<a name="stage_limit"></a>
## [$limit](https://docs.mongodb.com/manual/reference/operator/aggregation/limit/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$limit: 2
   ⬇︎      
{_id: '◐', x: '■', y: '▲', val: 11}
{_id: '◑', x: '■', y: '■', val: 74}   
```

&nbsp;

---

<a name="stage_lookup"></a>
## [$lookup](https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ✚
{_id: "▤", a: "●", b: ["◰", "◱"]}
{_id: "▥", a: "▲", b: ["◲"]}
{_id: "▦", a: "▲", b: ["◰", "◳", "◱"]}
{_id: "▧", a: "●", b: ["◰"]}
{_id: "▨", a: "■", b: ["◳", "◱"]}
   ⬇︎      
$lookup: {
  from: "lists",
  localField: "y",
  foreignField: "a",
  as: "refs"
}
   ⬇︎         
{_id: '◐', x: '■', y: '▲', val: 11, refs: [
  {_id: '▥', a: '▲', b: ['◲']},
  {_id: '▦', a: '▲', b: ['◰', '◳', '◱']}
]}
{_id: '◑', x: '■', y: '■', val: 74, refs: [
  {_id: '▨', a: '■', b: ['◳', '◱']}
]}
{_id: '◒', x: '●', y: '■', val: 79, refs: [
  {_id: '▨', a: '■', b: ['◳', '◱']}
]}
{_id: '◓', x: '▲', y: '▲', val: 81, refs: [
  {_id: '▥', a: '▲', b: ['◲']},
  {_id: '▦', a: '▲', b: ['◰', '◳', '◱']}
]}
{_id: '◔', x: '■', y: '▲', val: 83, refs: [
  {_id: '▥', a: '▲', b: ['◲']},
  {_id: '▦', a: '▲', b: ['◰', '◳', '◱']}
]}
{_id: '◕', x: '●', y: '■', val: 85, refs: [
  {_id: '▨', a: '■', b: ['◳', '◱']}
]}   
```

&nbsp;

---

<a name="stage_match"></a>
## [$match](https://docs.mongodb.com/manual/reference/operator/aggregation/match/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$match: {y: "▲"}  
   ⬇︎      
{_id: '◐', x: '■', y: '▲', val: 11}
{_id: '◓', x: '▲', y: '▲', val: 81}
{_id: '◔', x: '■', y: '▲', val: 83}   
```

&nbsp;

---

<a name="stage_merge"></a>
## [$merge](https://docs.mongodb.com/manual/reference/operator/aggregation/merge/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$merge: {into: "results"}
   ⬇︎      
db.results.find()   
{_id: '◐', x: '■', y: '▲', val: 11}
{_id: '◑', x: '■', y: '■', val: 74}
{_id: '◒', x: '●', y: '■', val: 79}
{_id: '◓', x: '▲', y: '▲', val: 81}
{_id: '◔', x: '■', y: '▲', val: 83}
{_id: '◕', x: '●', y: '■', val: 85}   
```

&nbsp;

---

<a name="stage_out"></a>
## [$out](https://docs.mongodb.com/manual/reference/operator/aggregation/out/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$out: "results"
   ⬇︎      
db.results.find()   
{_id: '◐', x: '■', y: '▲', val: 11}
{_id: '◑', x: '■', y: '■', val: 74}
{_id: '◒', x: '●', y: '■', val: 79}
{_id: '◓', x: '▲', y: '▲', val: 81}
{_id: '◔', x: '■', y: '▲', val: 83}
{_id: '◕', x: '●', y: '■', val: 85}   
```

&nbsp;

---

<a name="stage_project"></a>
## [$project](https://docs.mongodb.com/manual/reference/operator/aggregation/project/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$project: {x: 1}
   ⬇︎      
{_id: '◐', x: '■'}
{_id: '◑', x: '■'}
{_id: '◒', x: '●'}
{_id: '◓', x: '▲'}
{_id: '◔', x: '■'}
{_id: '◕', x: '●'}   
```

&nbsp;

---

<a name="stage_redact"></a>
## [$redact](https://docs.mongodb.com/manual/reference/operator/aggregation/redact/)

```javascript
{_id: "◧", loc: {type: "Point", coordinates: [1,1]}}
{_id: "◨", loc: {type: "Point", coordinates: [3,3]}}
{_id: "◩", loc: {type: "Point", coordinates: [5,5]}}
{_id: "◪", loc: {type: "LineString", coordinates: [[7,7],[8,8]]}}
   ⬇︎      
$redact: {$cond: {
  if  : {$eq: ["$type", "LineString"]},
  then: "$$PRUNE",
  else: "$$DESCEND"
}}
   ⬇︎      
{_id: '◧', loc: { type: 'Point', coordinates: [1,1]}}
{_id: '◨', loc: { type: 'Point', coordinates: [3,3]}}
{_id: '◩', loc: { type: 'Point', coordinates: [5,5]}}
{_id: '◪'}   
```

&nbsp;

---

<a name="stage_replaceRoot"></a>
## [$replaceRoot](https://docs.mongodb.com/manual/reference/operator/aggregation/replaceRoot/)

```javascript
{_id: "▤", a: "●", b: ["◰", "◱"]}
{_id: "▥", a: "▲", b: ["◲"]}
{_id: "▦", a: "▲", b: ["◰", "◳", "◱"]}
{_id: "▧", a: "●", b: ["◰"]}
{_id: "▨", a: "■", b: ["◳", "◱"]}
   ⬇︎      
$replaceRoot: {
  newRoot: {first: {$first: "$b"}, last: {$last: "$b"}}
}
   ⬇︎      
{first: '◰', last: '◱'}
{first: '◲', last: '◲'}
{first: '◰', last: '◱'}
{first: '◰', last: '◰'}
{first: '◳', last: '◱'}
```

&nbsp;

---

<a name="stage_replaceWith"></a>
## [$replaceWith](https://docs.mongodb.com/manual/reference/operator/aggregation/replaceWith/)

```javascript
{_id: "▤", a: "●", b: ["◰", "◱"]}
{_id: "▥", a: "▲", b: ["◲"]}
{_id: "▦", a: "▲", b: ["◰", "◳", "◱"]}
{_id: "▧", a: "●", b: ["◰"]}
{_id: "▨", a: "■", b: ["◳", "◱"]}
   ⬇︎      
$replaceWith:
  {first: {$first: "$b"}, last: {$last: "$b"}
}
   ⬇︎      
{first: '◰', last: '◱'}
{first: '◲', last: '◲'}
{first: '◰', last: '◱'}
{first: '◰', last: '◰'}
{first: '◳', last: '◱'}
```

&nbsp;

---

<a name="stage_sample"></a>
## [$sample](https://docs.mongodb.com/manual/reference/operator/aggregation/sample/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$sample: {size: 2}
   ⬇︎     
{_id: '◒', x: '●', y: '■', val: 79}
{_id: '◐', x: '■', y: '▲', val: 11}    
```

&nbsp;

---

<a name="stage_set"></a>
## [$set](https://docs.mongodb.com/manual/reference/operator/aggregation/set/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$set: {y: "▲"}
   ⬇︎      
{_id: '◐', x: '■', y: '▲', val: 11}
{_id: '◑', x: '■', y: '▲', val: 74}
{_id: '◒', x: '●', y: '▲', val: 79}
{_id: '◓', x: '▲', y: '▲', val: 81}
{_id: '◔', x: '■', y: '▲', val: 83}
{_id: '◕', x: '●', y: '▲', val: 85}        
```

&nbsp;

---

<a name="stage_setWindowFields"></a>
## [$setWindowFields](https://docs.mongodb.com/manual/reference/operator/aggregation/setWindowFields/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$setWindowFields: {
  partitionBy: "$x",
  sortBy: {"_id": 1},    
  output: {
    cumulativeValShapeX: {
      $sum: "$val",
      window: {
        documents: ["unbounded", "current"]
      }
    }
 }
}
   ⬇︎      
{_id: '◐', x: '■', y: '▲', val: 11, cumulativeValShapeX: 11}
{_id: '◑', x: '■', y: '■', val: 74, cumulativeValShapeX: 85}
{_id: '◔', x: '■', y: '▲', val: 83, cumulativeValShapeX: 168}
{_id: '◓', x: '▲', y: '▲', val: 81, cumulativeValShapeX: 81}
{_id: '◒', x: '●', y: '■', val: 79, cumulativeValShapeX: 79}
{_id: '◕', x: '●', y: '■', val: 85, cumulativeValShapeX: 164}
```

&nbsp;

---

<a name="stage_skip"></a>
## [$skip](https://docs.mongodb.com/manual/reference/operator/aggregation/skip/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$skip: 5
   ⬇︎      
{_id: '◕', x: '●', y: '■', val: 85}
```

&nbsp;

---

<a name="stage_sort"></a>
## [$sort](https://docs.mongodb.com/manual/reference/operator/aggregation/sort/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$sort: {x: 1, y: 1}
   ⬇︎      
{_id: '◑', x: '■', y: '■', val: 74}
{_id: '◐', x: '■', y: '▲', val: 11}
{_id: '◔', x: '■', y: '▲', val: 83}
{_id: '◓', x: '▲', y: '▲', val: 81}
{_id: '◒', x: '●', y: '■', val: 79}
{_id: '◕', x: '●', y: '■', val: 85}   
```

&nbsp;

---

<a name="stage_sortByCount"></a>
## [$sortByCount](https://docs.mongodb.com/manual/reference/operator/aggregation/sortByCount/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$sortByCount: "$x"
   ⬇︎    
{_id: '■', count: 3}
{_id: '●', count: 2}
{_id: '▲', count: 1}     
```

&nbsp;

---

<a name="stage_unionWith"></a>
## [$unionWith](https://docs.mongodb.com/manual/reference/operator/aggregation/unionWith/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ✚
{_id: "▤", a: "●", b: ["◰", "◱"]}
{_id: "▥", a: "▲", b: ["◲"]}
{_id: "▦", a: "▲", b: ["◰", "◳", "◱"]}
{_id: "▧", a: "●", b: ["◰"]}
{_id: "▨", a: "■", b: ["◳", "◱"]}
   ⬇︎      
$unionWith: {coll: "lists"} 
   ⬇︎    
{_id: '◐', x: '■', y: '▲', val: 11}
{_id: '◑', x: '■', y: '■', val: 74}
{_id: '◒', x: '●', y: '■', val: 79}
{_id: '◓', x: '▲', y: '▲', val: 81}
{_id: '◔', x: '■', y: '▲', val: 83}
{_id: '◕', x: '●', y: '■', val: 85}
{_id: '▤', a: '●', b: ['◰', '◱']}
{_id: '▥', a: '▲', b: ['◲']}
{_id: '▦', a: '▲', b: ['◰', '◳', '◱']}
{_id: '▧', a: '●', b: ['◰']}
{_id: '▨', a: '■', b: ['◳', '◱']}     
```

&nbsp;

---

<a name="stage_unset"></a>
## [$unset](https://docs.mongodb.com/manual/reference/operator/aggregation/unset/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 11}
{_id: "◑", x: "■", y: "■", val: 74}
{_id: "◒", x: "●", y: "■", val: 79}
{_id: "◓", x: "▲", y: "▲", val: 81}
{_id: "◔", x: "■", y: "▲", val: 83}
{_id: "◕", x: "●", y: "■", val: 85}
   ⬇︎      
$unset: ["x"] 
   ⬇︎  
{_id: '◐', y: '▲', val: 11}
{_id: '◑', y: '■', val: 74}
{_id: '◒', y: '■', val: 79}
{_id: '◓', y: '▲', val: 81}
{_id: '◔', y: '▲', val: 83}
{_id: '◕', y: '■', val: 85}       
```

&nbsp;

---

<a name="stage_unwind"></a>
## [$unwind](https://docs.mongodb.com/manual/reference/operator/aggregation/unwind/)

```javascript
{_id: "▤", a: "●", b: ["◰", "◱"]}
{_id: "▥", a: "▲", b: ["◲"]}
{_id: "▦", a: "▲", b: ["◰", "◳", "◱"]}
{_id: "▧", a: "●", b: ["◰"]}
{_id: "▨", a: "■", b: ["◳", "◱"]}
   ⬇︎      
$unwind: {path: "$b"}
   ⬇︎      
{_id: '▤', a: '●', b: '◰'}
{_id: '▤', a: '●', b: '◱'}
{_id: '▥', a: '▲', b: '◲'}
{_id: '▦', a: '▲', b: '◰'}
{_id: '▦', a: '▲', b: '◳'}
{_id: '▦', a: '▲', b: '◱'}
{_id: '▧', a: '●', b: '◰'}
{_id: '▨', a: '■', b: '◳'}
{_id: '▨', a: '■', b: '◱'}   
```

&nbsp;

---

