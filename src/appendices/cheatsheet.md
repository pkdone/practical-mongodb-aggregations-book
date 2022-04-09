# Stages Cheatsheet

A simple example for each [stage in the MongoDB Aggregation Framework](https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline/). 


#### Stages:

| Query                      | Mutate                                     | Summarise/Itemise                  | Join                               | Input/Output                   |
| :--------------------------| :------------------------------------------| :----------------------------------| :----------------------------------| :------------------------------|
| [$geoNear](#stage_geoNear) | [$addFields](#stage_addFields)             | [$bucket](#stage_bucket)           | [$graphLookup](#stage_graphLookup) | [$documents](#stage_documents) |
| [$limit](#stage_limit)     | [$densify](#stage_densify)                 | [$bucketAuto](#stage_bucketAuto)   | [$lookup](#stage_lookup)           | [$merge](#stage_merge)         |
| [$match](#stage_match)     | [$fill](#stage_fill)                       | [$count](#stage_count)             | [$unionWith](#stage_unionWith)     | [$out](#stage_out)             |
| [$sample](#stage_sample)   | [$project](#stage_project)                 | [$facet](#stage_facet)             |                                    |                                |
| [$skip](#stage_skip)       | [$redact](#stage_redact)                   | [$group](#stage_group)             |                                    |                                |
| [$sort](#stage_sort)       | [$replaceRoot](#stage_replaceRoot)         | [$sortByCount](#stage_sortByCount) |                                    |                                |
|                            | [$replaceWith](#stage_replaceWith)         | [$unwind](#stage_unwind)           |                                    |                                |
|                            | [$set](#stage_set)                         |                                    |                                    |                                |
|                            | [$setWindowFields](#stage_setWindowFields) |                                    |                                    |                                |
|                            | [$unset](#stage_unset)                     |                                    |                                    |                                |


> _The following stages are not included because they are unrelated to aggregating business data or rely on external systems: &nbsp;`$collStats`, `$indexStats`, `$listSessions`, `$planCacheStats`, `$currentOp`, `$listLocalSessions`, `$search`, `$searchMeta`_

#### Input Collections:

```javascript
// shapes
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}

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
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$addFields: {z: "●"}      
   ⬇︎      
{_id: '◐', x: '■', y: '▲', val: 10, ord: 0, z: '●'}
{_id: '◑', x: '■', y: '■', val: 60, z: '●'}
{_id: '◒', x: '●', y: '■', val: 80, z: '●'}
{_id: '◓', x: '▲', y: '▲', val: 85, z: '●'}
{_id: '◔', x: '■', y: '▲', val: 90, z: '●'}
{_id: '◕', x: '●', y: '■', val: 95 ord: 100, z: '●'}
```

&nbsp;

---

<a name="stage_bucket"></a>
## [$bucket](https://docs.mongodb.com/manual/reference/operator/aggregation/bucket/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
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
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$bucketAuto: {groupBy: "$val", buckets: 3}
   ⬇︎      
{_id: {min: 10, max: 80}, count: 2}
{_id: {min: 80, max: 90}, count: 2}
{_id: {min: 90, max: 95}, count: 2}   
```

&nbsp;

---

<a name="stage_count"></a>
## [$count](https://docs.mongodb.com/manual/reference/operator/aggregation/count/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$count: "amount"
   ⬇︎      
{amount: 6}    
```

&nbsp;

---

<a name="stage_densify"></a>
## [$densify](https://docs.mongodb.com/v5.3/reference/operator/aggregation/densify/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$densify: {
  field: "val",
  partitionByFields: ["x"],
  range: {bounds: "full", step: 25}
}
   ⬇︎      
{_id: '◐', x: '■', y: '▲', val: 10, ord: 0}
{x: '■', val: 35}
{_id: '◑', x: '■', y: '■', val: 60}
{x: '●', val: 10}
{x: '●', val: 35}
{x: '●', val: 60}
{_id: '◒', x: '●', y: '■', val: 80}
{x: '▲', val: 10}
{x: '▲', val: 35}
{x: '▲', val: 60}
{_id: '◓', x: '▲', y: '▲', val: 85}
{x: '■', val: 85}
{_id: '◔', x: '■', y: '▲', val: 90}
{x: '●', val: 85}
{_id: '◕', x: '●', y: '■', val: 95, ord: 100}
```

&nbsp;

---

<a name="stage_documents"></a>
## [$documents](https://docs.mongodb.com/v5.3/reference/operator/aggregation/documents/)

```javascript
[     ]
   ⬇︎      
$documents: {
  {p: "▭", q: "▯"},
  {p: "▯", q: "▭"}
}
   ⬇︎      
{p: '▭', q: '▯'}
{p: '▯', q: '▭'}
```

&nbsp;

---

<a name="stage_facet"></a>
## [$facet](https://docs.mongodb.com/manual/reference/operator/aggregation/facet/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$facet: {
  X_CIRCLE_FACET: [{$match: {x: "●"}}],
  FIRST_TWO_FACET: [{$limit: 2}]
}
   ⬇︎      
{
  X_CIRCLE_FACET: [
    {_id: '◒', x: '●', y: '■', val: 80},
    {_id: '◕', x: '●', y: '■', val: 95, ord: 100}
  ],
  FIRST_TWO_FACET: [
    {_id: '◐', x: '■', y: '▲', val: 10, ord: 0},
    {_id: '◑', x: '■', y: '■', val: 60}
  ]
}   
```

&nbsp;

---

<a name="stage_fill"></a>
## [$fill](https://docs.mongodb.com/v5.3/reference/operator/aggregation/fill/)
           
```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$fill: {
  sortBy: {val: 1},        
  output: {
    ord: {method: "linear"}
  }
}
   ⬇︎      
{_id: '◐', x: '■', y: '▲', val: 10, ord: 0}
{_id: '◑', x: '■', y: '■', val: 60, ord: 58.82352941176471}
{_id: '◒', x: '●', y: '■', val: 80, ord: 82.3529411764706}
{_id: '◓', x: '▲', y: '▲', val: 85, ord: 88.23529411764706}
{_id: '◔', x: '■', y: '▲', val: 90, ord: 94.11764705882354}
{_id: '◕', x: '●', y: '■', val: 95, ord: 100}
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
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
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
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
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
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$limit: 2
   ⬇︎      
{_id: '◐', x: '■', y: '▲', val: 10, ord: 0}
{_id: '◑', x: '■', y: '■', val: 60}   
```

&nbsp;

---

<a name="stage_lookup"></a>
## [$lookup](https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
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
{_id: '◐', x: '■', y: '▲', val: 10, ord: 0, refs: [
  {_id: '▥', a: '▲', b: ['◲']},
  {_id: '▦', a: '▲', b: ['◰', '◳', '◱']}
]}
{_id: '◑', x: '■', y: '■', val: 60, refs: [
  {_id: '▨', a: '■', b: ['◳', '◱']}
]}
{_id: '◒', x: '●', y: '■', val: 80, refs: [
  {_id: '▨', a: '■', b: ['◳', '◱']}
]}
{_id: '◓', x: '▲', y: '▲', val: 85, refs: [
  {_id: '▥', a: '▲', b: ['◲']},
  {_id: '▦', a: '▲', b: ['◰', '◳', '◱']}
]}
{_id: '◔', x: '■', y: '▲', val: 90, refs: [
  {_id: '▥', a: '▲', b: ['◲']},
  {_id: '▦', a: '▲', b: ['◰', '◳', '◱']}
]}
{_id: '◕', x: '●', y: '■', val: 95, ord: 100, refs: [
  {_id: '▨', a: '■', b: ['◳', '◱']}
]}   
```

&nbsp;

---

<a name="stage_match"></a>
## [$match](https://docs.mongodb.com/manual/reference/operator/aggregation/match/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$match: {y: "▲"}  
   ⬇︎      
{_id: '◐', x: '■', y: '▲', val: 10, ord: 0}
{_id: '◓', x: '▲', y: '▲', val: 85}
{_id: '◔', x: '■', y: '▲', val: 90}   
```

&nbsp;

---

<a name="stage_merge"></a>
## [$merge](https://docs.mongodb.com/manual/reference/operator/aggregation/merge/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$merge: {into: "results"}
   ⬇︎      
db.results.find()   
{_id: '◐', x: '■', y: '▲', val: 10, ord: 0}
{_id: '◑', x: '■', y: '■', val: 60}
{_id: '◒', x: '●', y: '■', val: 80}
{_id: '◓', x: '▲', y: '▲', val: 85}
{_id: '◔', x: '■', y: '▲', val: 90}
{_id: '◕', x: '●', y: '■', val: 95, ord: 100}   
```

&nbsp;

---

<a name="stage_out"></a>
## [$out](https://docs.mongodb.com/manual/reference/operator/aggregation/out/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$out: "results"
   ⬇︎      
db.results.find()   
{_id: '◐', x: '■', y: '▲', val: 10, ord: 0}
{_id: '◑', x: '■', y: '■', val: 60}
{_id: '◒', x: '●', y: '■', val: 80}
{_id: '◓', x: '▲', y: '▲', val: 85}
{_id: '◔', x: '■', y: '▲', val: 90}
{_id: '◕', x: '●', y: '■', val: 95, ord: 100}   
```

&nbsp;

---

<a name="stage_project"></a>
## [$project](https://docs.mongodb.com/manual/reference/operator/aggregation/project/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
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
$replaceWith: {
  first: {$first: "$b"}, last: {$last: "$b"}
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
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$sample: {size: 3}
   ⬇︎     
{_id: '◔', x: '■', y: '▲', val: 90}
{_id: '◓', x: '▲', y: '▲', val: 85}
{_id: '◑', x: '■', y: '■', val: 60}
```

&nbsp;

---

<a name="stage_set"></a>
## [$set](https://docs.mongodb.com/manual/reference/operator/aggregation/set/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$set: {y: "▲"}
   ⬇︎      
{_id: '◐', x: '■', y: '▲', val: 10, ord: 0}
{_id: '◑', x: '■', y: '▲', val: 60}
{_id: '◒', x: '●', y: '▲', val: 80}
{_id: '◓', x: '▲', y: '▲', val: 85}
{_id: '◔', x: '■', y: '▲', val: 90}
{_id: '◕', x: '●', y: '▲', val: 95, ord: 100}        
```

&nbsp;

---

<a name="stage_setWindowFields"></a>
## [$setWindowFields](https://docs.mongodb.com/manual/reference/operator/aggregation/setWindowFields/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
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
{_id: '◐', x: '■', y: '▲', val: 10, ord: 0, cumulativeValShapeX: 10}
{_id: '◑', x: '■', y: '■', val: 60, cumulativeValShapeX: 70}
{_id: '◔', x: '■', y: '▲', val: 90, cumulativeValShapeX: 160}
{_id: '◓', x: '▲', y: '▲', val: 85, cumulativeValShapeX: 85}
{_id: '◒', x: '●', y: '■', val: 80, cumulativeValShapeX: 80}
{_id: '◕', x: '●', y: '■', val: 95, ord: 100, cumulativeValShapeX: 175}
```

&nbsp;

---

<a name="stage_skip"></a>
## [$skip](https://docs.mongodb.com/manual/reference/operator/aggregation/skip/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$skip: 5
   ⬇︎      
{_id: '◕', x: '●', y: '■', val: 95, ord: 100}
```

&nbsp;

---

<a name="stage_sort"></a>
## [$sort](https://docs.mongodb.com/manual/reference/operator/aggregation/sort/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$sort: {x: 1, y: 1}
   ⬇︎      
{_id: '◑', x: '■', y: '■', val: 60}
{_id: '◐', x: '■', y: '▲', val: 10, ord: 0}
{_id: '◔', x: '■', y: '▲', val: 90}
{_id: '◓', x: '▲', y: '▲', val: 85}
{_id: '◒', x: '●', y: '■', val: 80}
{_id: '◕', x: '●', y: '■', val: 95, ord: 100}   
```

&nbsp;

---

<a name="stage_sortByCount"></a>
## [$sortByCount](https://docs.mongodb.com/manual/reference/operator/aggregation/sortByCount/)

```javascript
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
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
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ✚
{_id: "▤", a: "●", b: ["◰", "◱"]}
{_id: "▥", a: "▲", b: ["◲"]}
{_id: "▦", a: "▲", b: ["◰", "◳", "◱"]}
{_id: "▧", a: "●", b: ["◰"]}
{_id: "▨", a: "■", b: ["◳", "◱"]}
   ⬇︎      
$unionWith: {coll: "lists"} 
   ⬇︎    
{_id: '◐', x: '■', y: '▲', val: 10, ord: 0}
{_id: '◑', x: '■', y: '■', val: 60}
{_id: '◒', x: '●', y: '■', val: 80}
{_id: '◓', x: '▲', y: '▲', val: 85}
{_id: '◔', x: '■', y: '▲', val: 90}
{_id: '◕', x: '●', y: '■', val: 95, ord: 100}
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
{_id: "◐", x: "■", y: "▲", val: 10, ord: 0}
{_id: "◑", x: "■", y: "■", val: 60}
{_id: "◒", x: "●", y: "■", val: 80}
{_id: "◓", x: "▲", y: "▲", val: 85}
{_id: "◔", x: "■", y: "▲", val: 90}
{_id: "◕", x: "●", y: "■", val: 95, ord: 100}
   ⬇︎      
$unset: ["x"] 
   ⬇︎  
{_id: '◐', y: '▲', val: 10, ord: 0}
{_id: '◑', y: '■', val: 60}
{_id: '◒', y: '■', val: 80}
{_id: '◓', y: '▲', val: 85}
{_id: '◔', y: '▲', val: 90}
{_id: '◕', y: '■', val: 95, ord: 100}       
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

