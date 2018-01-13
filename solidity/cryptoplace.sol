pragma solidity ^0.4.19;


contract CryptoPlace {
    struct Color {
        uint8 r;
        uint8 g;
        uint8 b;

    }

    struct Tile {
        Color color;
        address owner;
    }

    mapping (uint => Tile) grid;

    function getTileColorRedAt(uint8 xy) public view returns (uint8) {
        return grid[xy].color.r;
    }

    function getTileColorGreenAt(uint8 xy) public view returns (uint8) {
        return grid[xy].color.g;
    }

    function getTileColorBlueAt(uint8 xy) public view returns (uint8) {
        return grid[xy].color.b;
    }

    function getTileOwner(uint8 xy) public view returns (address) {
        return grid[xy].owner;
    }

    function paintTile(uint8 xy, uint8 r, uint8 g, uint8 b) public {
        Color memory c = Color({ r: r, g: g, b: b });
        grid[xy] = Tile({ color: c, owner: msg.sender });
    }
}
