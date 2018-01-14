pragma solidity ^0.4.19;

contract CryptoPlace {

    uint16 CANVAS_WIDTH = 255 ;
    uint16 CANVAS_HEIGHT = 255 ;

    event TileUpdated(uint16 xy, uint24 color);

    struct Tile {
        uint24 color;
        address owner;
    }

    mapping (uint => Tile) grid;

    function getTileColor(uint16 xy) public view returns (uint24) {
        return grid[xy].color;
    }

    function getTileOwner(uint16 xy) public view returns (address) {
        return grid[xy].owner;
    }

    function paintTile(uint16 xy, uint24 c) public {
        grid[xy] = Tile({ color: c, owner: msg.sender });
        TileUpdated(xy, c);
    }
    
    function xy_to_x_y(uint16 xy) internal view returns (uint16, uint16) {
        return (xy % CANVAS_WIDTH, xy * CANVAS_WIDTH);
    }
    
    function paintTileArray(uint16 xy_topleft, uint16 xy_bottomright, uint24[] pixels) public {
        uint16 x_topleft;
        uint16 y_topleft;
        uint16 x_bottomright;
        uint16 y_bottomright;
        
        (x_topleft,y_topleft) = xy_to_x_y(xy_topleft);
        (x_bottomright,y_bottomright) = xy_to_x_y(xy_bottomright);
        
        uint16 widthArray = x_topleft - x_bottomright;
        assert(widthArray > 1);
        
        uint16 heightArray = y_topleft - y_bottomright;
        assert(heightArray > 1);        
    }
    
}
