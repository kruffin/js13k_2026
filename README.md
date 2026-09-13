# u6s and r6s

Entry for js13k (Unicorns and Rainbows).

## Story
Sumas (you) received a distress signal from the planet Unicon-6 and landed to investigate. Meeting Neera, Sumas learns that the Blerguns have locked away the unicorns. With unicorns sealed, their rainbows can't bathe the world in color making it dull and bland.

## Objectives
* Break the unicorns out and restore color to the planet.
* Get upgrades to help break them out (missles, high jump).
* The more unicorns broken out, the easier the boss will be. (they shoot rainbows at the boss to debuff it).

## Upgrades
Two upgrades will be in the game:

1. Missles - Ammo limited exploding projectiles.
2. High Jump - Jump higher.
3. Max Health - Increase your maximum health.
4. Max Missles - Increase your maximum missles.

## Drops
Defeated enemies can drop health (if your player is hurt) and missles (if you have the upgrade and have space).

## Enemies

### Blarb
* Passive
* Walks around and avoids drops.
* Slug-like thing with spikes.
* Damages player when run into.

### Blurb
* Aggressive
* Stands still and shoots when player is in range or has been shot.
* More like a plant.

### Bleald
* Aggressive
* Defensive plate reduces player damage from the front.
* Missles deal normal damage.
* Walks around and charges towards player.
* Thinking like a rhino.
* Damages player when running into.

### Blergun Prime
* Boss leader of Blergun on this planet assault.
* Spawns Blarb, Blurb, and Bleald monsters if none are around.
* Walks back and forth in the arena.
* TBD

## Music
Hold music to load back into https://xem.github.io/miniOrchestra/

* level - [{"octave":"400","duration":".19","decaystart":".18","decayduration":".005","interval":".2","volume":".1","wave":"triangle","data":[[0,18],[4,18],[20,18],[12,15],[8,15],[16,18],[24,21],[28,21],[15,8],[23,8],[19,11],[27,5]]}]
* cannon - [{"octave":"500","duration":".19","decaystart":".18","decayduration":".005","interval":".2","volume":".05","wave":"sine","data":[[0,13]]}]
* missle - [{"octave":"500","duration":".19","decaystart":".18","decayduration":".005","interval":".2","volume":".05","wave":"sine","data":[[0,13],[0,18]]}]
* player hit - [{"octave":"400","duration":".19","decaystart":".18","decayduration":".005","interval":".2","volume":".1","wave":"sawtooth","data":[[0,3],[0,20],[0,23]]}]

## Level Bin Reduction
### Only startRow
5.7K Sep  2 11:29 level0.bin
8.3K Sep  2 11:29 level1.bin
6.3K Sep 11 14:18 level2.bin
5.7K Sep 11 13:45 level3.bin
5.9K Sep  3 14:50 level4.bin

137 bytes free

### start/end row/column
5.7K Sep 11 15:30 levels/level0.bin
8.0K Sep 11 15:55 levels/level1.bin
6.3K Sep 11 15:55 levels/level2.bin
4.4K Sep 11 15:55 levels/level3.bin
5.8K Sep 11 15:55 levels/level4.bin

51 bytes free

### start/end row
5666 Sep 12 19:17 ./levels/level0.bin
8192 Sep 12 19:18 ./levels/level1.bin
6256 Sep 12 19:18 ./levels/level2.bin
4299 Sep 12 19:18 ./levels/level3.bin
6079 Sep 12 19:18 ./levels/level4.bin

78 bytes free

### layer types 0 and 1 - Compresses worse though :'(
2362 Sep 12 14:18 levels/level0.bin
3156 Sep 12 14:29 levels/level1.bin
3059 Sep 12 14:18 levels/level2.bin
2272 Sep 12 14:18 levels/level3.bin
2479 Sep 12 14:18 levels/level4.bin

### layer type 2
1779 Sep 12 16:51 ./levels/level0.bin
2273 Sep 12 16:51 ./levels/level1.bin
2868 Sep 12 16:51 ./levels/level2.bin
1579 Sep 12 16:51 ./levels/level3.bin
1746 Sep 12 16:52 ./levels/level4.bin

### layer type 3
1460 Sep 12 18:59 ./levels/level0.bin
1890 Sep 12 18:59 ./levels/level1.bin
1963 Sep 12 19:00 ./levels/level2.bin
1011 Sep 12 19:00 ./levels/level3.bin
1286 Sep 12 19:00 ./levels/level4.bin


### Bin Format

#### Header Data
| Bytes | Name | Description |
|-------|------|-------------|
| 1 | frictionGround | Signed byte for ground friction |
| 2 | gravity | x,y coordinates (2 bytes total) |
| 2 | size | x,y dimensions (2 bytes total) |
| 2 | tileSize | x,y tile dimensions (2 bytes total) |
| 1 | groundLayerIdx | Ground layer index |

#### Tile Coordinates
| Bytes | Name | Description |
|-------|------|-------------|
| 1 | tileCoords count | Number of tile coordinates |
| 1 | tileCoord.x | X coordinate |
| 1 | tileCoord.y | Y coordinate |
| 1 | tileCoord.width | Width |
| 1 | tileCoord.height | Height |
| 1 bit | tileCoord.solid | Solid flag (0 = false, 1 = true) |
| 2 bits | tileCoord.destroyable | Destroyable flag (3 = undefined, 0 = cannon, 1 = missile) |
| 3 bits | tileCoord.levelIndex | Level index (7 = undefined) |
| 2 bits | tileCoord.sheetIndex | Sheet index ('raw' = 0, 'tiles' = 1, 'player' = 2, 'unicorn' = 3) |
| 1 | tileCoord.damage | Damage value |
| 6 | tileCoord | Total bytes per tile coordinate |

#### Layers
| Bytes | Name | Description |
|-------|------|-------------|
| 1 | layers count | Number of layers |
| 1 | layer.type | Layer type |
|   | Layer Type 0 | |
| 1 | layer.startRow | Start row |
| 1 | layer.endRow | End row |
| 1 byte * size.x * (endRow - startRow) | layer.tiles | Tile data |
|   | Layer Type 1 | |
| 1 | layer.startRow | Start row |
| 1 | layer.endRow | End row |
| 1 | layer.fillTile | Fill tile ID |
| 2 | layer.tileDiffCount | Number of tile differences |
| 1 | layer.tileDiff.tileId | Tile ID |
| 1 | layer.tileDiff.x | X coordinate |
| 1 | layer.tileDiff.y | Y coordinate |
|   | Layer Type 2 | |
| 1 | layer.startRow | Start row |
| 1 | layer.endRow | End row |
| 1 | layer.fillTile | Fill tile ID |
| 1 | layer.tileDiffCount | Number of different tiles |
| 1 | layer.tileDiff.tileId | Tile ID |
| 2 | layer.tileDiff.positionCount | Number of this tile |
| 1 | layer.tileDiff.pos.x | X coordinate |
| 1 | layer.tileDiff.pos.y | Y coordinate |
|   | Layer Type 3 | |
| 1 | layer.startRow | Start row |
| 1 | layer.endRow | End row |
| 1 | layer.fillTile | Fill tile ID |
| 1 | layer.tileDiffCount | Number of different tiles |
| 1 | layer.tileDiff.tileId | Tile ID |
| 1 | layer.tileDiff.yPositionCount | Number of this tile at a y position |
| 1 | layer.tileDiff.pos.y | Y coordinate |
| 1 | layer.tileDiff.xPositionCount | Number of x positions |
| 1 | layer.tileDiff.pos.x | X coordinate |

#### Enemies
| Bytes | Name | Description |
|-------|------|-------------|
| 1 | enemies count | Number of enemies |
| 1 | enemy.type | Enemy type ('blarb' = 0) |
| 2 | enemy.x | X coordinate |
| 2 | enemy.y | Y coordinate |
| 5 | enemy | Total bytes per enemy |

#### Friendly Entities
| Bytes | Name | Description |
|-------|------|-------------|
| 1 | friendly count | Number of friendly entities |
| 1 | friendly.type | Friendly type ('unicorn' = 0, 'ship' = 1) |
| 2 | friendly.x | X coordinate |
| 2 | friendly.y | Y coordinate |
| 5 | friendly | Total bytes per friendly entity |

#### Players
| Bytes | Name | Description |
|-------|------|-------------|
| 1 | player count | Number of players |
| 2 | player.x | X coordinate |
| 2 | player.y | Y coordinate |

<!-- * frictionGround: 1 signed byte
* gravity: x,y - 2 bytes
* size: x,y - 2 bytes
* tileSize: x,y - 2 bytes
* groundLayerIdx: 1 byte
* tileCoords count - 1 byte

* tileCoord: x, y, width, height, solid?, destroyable, level index, sheet index, damage
* x,y - 2 bytes
* width,height - 2 bytes
* solid: 0 = false, 1 = true - 1 bit
* destroyable: 3 = undefined (0 = cannon, 1 = missle) - 2 bit
* level index: 7 = undefined - 3 bits
* sheet index: 'raw' = 0, 'tiles' = 1, 'player' = 2, 'unicorn' = 3 - 2 bits
* damage - 1 byte
* total bytes per tileCoord: 6

* layers count: 1 byte
* layer: layer type, (startRow, endRow, tiles) or (fill tile, tile diff)
* layer startRow: 1 byte
* layer endRow: 1 byte
* layer tiles: 1 byte * size.x * (endRow - startRow)
* fill tile: 1 byte
* tile diff count: stores the number of tile diff elements - 2 bytes
* tile diff: tile id, x, y
* tile id: 1 byte
* tile x: 1 byte
* tile y: 1 byte

* enemies count: 1 byte
* enemy: type, x, y - 2 bytes each
* enemy type: 'blarb' = 0 - 1 byte
* total bytes per enemy: 5

* friendly count: 1 byte
* friendly: type, x, y - 2 bytes each
* friendly type: 'unicorn' = 0, 'ship' = 1 - 1 byte
* total bytes per friendly: 5

* player count: 1 byte
* player: x, y - 2 bytes each -->