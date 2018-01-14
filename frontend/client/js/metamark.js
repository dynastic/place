const CANVAS_WIDTH = 255;
const CANVAS_HEIGHT = 255;

var ABI = [{"constant":false,"inputs":[{"name":"xy","type":"uint16"},{"name":"c","type":"uint24"}],"name":"paintTile","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"xy","type":"uint16"}],"name":"getTileOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"xy_topleft","type":"uint16"},{"name":"xy_bottomright","type":"uint16"},{"name":"pixels","type":"uint24[]"}],"name":"paintTileArray","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"xy","type":"uint16"}],"name":"getTileColor","outputs":[{"name":"","type":"uint24"}],"payable":false,"stateMutability":"view","type":"function"},{"anonymous":false,"inputs":[{"indexed":false,"name":"xy","type":"uint16"},{"indexed":false,"name":"color","type":"uint24"}],"name":"TileUpdated","type":"event"}];

var CONTRACT_ADDRESS = '0xf5960240fb60e9db4777678583c4e8f5bbe85d8c';

window.addEventListener('load', function() {
  if (typeof web3 !== 'undefined') {
    var eth = new Web3(web3.currentProvider)
    window.eth = eth

    console.log('MetaMask found!!', eth)

    var cryptoplaceContract = web3.eth.contract(ABI);
    window.contract = cryptoplaceContract;

    const contractInstance = cryptoplaceContract.at(CONTRACT_ADDRESS);
    window.contractInstance = contractInstance;
  } else {
    window.alert('Please install MetaMask!!')
    return;
  }
})

function xAndYToXY(x, y) {
  return x + (y * CANVAS_HEIGHT);
}

function stringHexToUint24(hex) {
  let newHex = (hex[0] === "#") ? hex.substring(1, hex.length) : hex;

  return parseInt(newHex, 16);
}

function getTileOwner(x, y) {
  const xy = xAndYToXY(x, y);

  return new Promise((resolve, reject) => {
    window.contractInstance.getTileOwner(xy, {from: web3.eth.accounts[0]}, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(result);
    });
  });
}

function getTileColor(x, y) {
  const xy = xAndYToXY(x, y);

  return new Promise((resolve, reject) => {
    window.contractInstance.getTileColor(xy, {from: web3.eth.accounts[0]}, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(result);
    });
  });
}

function paintTile(x, y, color) {
  const xy = xAndYToXY(x, y);
  const colorUInt24 = stringHexToUint24(color);

  return new Promise((resolve, reject) => {
    window.contractInstance.paintTile(xy, colorUInt24, {from: web3.eth.accounts[0]}, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      console.log(result);
      resolve(result);
    });
  });
}
