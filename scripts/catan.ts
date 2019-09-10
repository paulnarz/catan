class Tile {
    public x: number;
    public y: number;    
    public fillOrder: number;
    public numberValue: number;
    public ints: { [dir: string]: Intersection };
    public dots: number;
}

enum Direction 
{
    Top,
    Bottom,
    Left,
    Right
}

class Intersection
{
    public label: string;
    public prodSum: number;
}

class Totals
{
    public dessert: number;
    public count: number;
    public sum: number;
    public avg: number;
    public min: number;
    public max: number;
    public counts: number[];

    public constructor(dessert: number, values: number[])
    {
        this.count = values.length;
        this.sum = 0;
        this.avg = 0;
        this.min = Infinity;
        this.max = 0;
        this.counts = [];

        for (var i = 0; i < values.length; i++)
        {
            var value = values[i];
            this.sum += value;
            if (value < this.min)
                this.min = value;
            if (value > this.max)
                this.max = value;
            if (!this.counts[value])
                this.counts[value] = 1;
            else
                this.counts[value] = this.counts[value] + 1;
        }

        for (var i = 0; i < this.max; i++) {
            if (!this.counts[i])
                this.counts[i] = 0;
        }

        if (this.count > 0)
            this.avg = this.sum / this.count;
    }
}

class Catan {
    public hexagon_r = 64;
    public hexagon_h = Math.round(64 * Math.sqrt(3) / 2);

    public board_width: number;
    public board_height: number;
    public board_left: number;
    public board_top: number;
    public board_hex_width: number;
    public board_hex_height: number;

    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    public tiles: Tile[];
    public ints: Intersection[];

    public dot_ints: Intersection[];
    public dot_totals: Totals;

    public dessert: number = 1;

    public fillOrder = [
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 5, 0, 0, 0],
        [0, 3, 4, 15, 6, 7, 0],
        [0, 2, 14, 19, 16, 8, 0],
        [0, 1, 13, 18, 17, 9, 0],
        [0, 0, 12, 11, 10, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
    ];

    public tileOrder = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

    public dot_lookup = {
        0: 0,
        1: 0,
        2: 1,
        3: 2,
        4: 3,
        5: 4,
        6: 5,
        7: 6,
        8: 5,
        9: 4,
        10: 3,
        11: 2,
        12: 1,
    };

    constructor(canvasID: string) {
        this.canvas = document.getElementById(canvasID) as HTMLCanvasElement;

        this.canvas.onclick = this.onCanvasClick;

        this.ctx = this.canvas.getContext("2d");

        this.redraw(this.dessert);
    }

    public redraw(dessert?: number) {
        if (dessert)
            this.dessert = dessert;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.buildBoard();
        this.calcInts();
        this.drawGrid();
    }

    public buildBoard() {
        this.tiles = [];
        this.board_width = this.fillOrder[0].length;
        this.board_height = this.fillOrder.length;

        this.board_hex_width = this.hexagon_r * (1 / 2 + 3 / 2 * this.board_width);
        this.board_hex_height = this.hexagon_h * (1 + 2 * this.board_height);
        this.board_left = this.canvas.width / 2 - this.board_hex_width / 2;
        this.board_top = this.canvas.height / 2 - this.board_hex_height / 2 - this.hexagon_h / 2;

        //this.ctx.strokeRect(this.board_left, this.board_top, this.board_hex_width, this.board_hex_height);
        ////draw middles lines
        //this.ctx.beginPath();
        //this.ctx.moveTo(0, this.canvas.height / 2);
        //this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        //this.ctx.moveTo(this.canvas.width / 2, 0);
        //this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        //this.ctx.stroke();

        var nextTile = 0;

        for (var y = 0; y < this.board_height; y++) {
            var row = this.fillOrder[y];
            for (var x = 0; x < this.board_width; x++) {
                var fillOrder = row[x];
                var tile = new Tile();
                tile.x = x;
                tile.y = y;

                if (fillOrder) {
                    tile.fillOrder = fillOrder;
                    if (fillOrder < this.dessert)
                        tile.numberValue = this.tileOrder[fillOrder - 1];
                    else if (fillOrder > this.dessert)
                        tile.numberValue = this.tileOrder[fillOrder - 2];
                    else
                        tile.numberValue = 0;

                    tile.dots = this.dot_lookup[tile.numberValue];
                }

                this.tiles.push(tile);
            }
        }
    }

    public calcInts() {
        this.ints = [];

        for (var y = 0; y < this.board_height; y++) {
            for (var x = 0; x < this.board_width; x++) {

                var tile = this.getTile(x, y);

                if (tile) {
                    tile.ints = {
                    };
                    //tile.ints["top"] = this.calcInt(x, y, "top");
                    //tile.ints["bottom"] = this.calcInt(x, y, "bottom");
                    tile.ints[Direction.Left] = this.calcInt(x, y, Direction.Left);
                    tile.ints[Direction.Right] = this.calcInt(x, y, Direction.Right);
                    this.ints.push(tile.ints[Direction.Left]);
                    this.ints.push(tile.ints[Direction.Right]);
                }
            }
        }

        this.dot_ints = this.ints.filter(i => i.prodSum >= 0);
        this.dot_totals = new Totals(this.dessert, this.dot_ints.map(i => i.prodSum));

        console.log(this.dot_totals)
    }

    public calcInt(x: number, y: number, dir: Direction): Intersection {
        var touches = this.getIntTiles(x, y, dir).filter(t => t && t.numberValue >= 0);
        var int = new Intersection();

        if (touches.length) {
            int.label = touches
                .map(t => t.numberValue)
                .join("_");

            int.prodSum = touches
                .reduce((s, t) => s + t.dots, 0);
        }

        return int;
    }

    public getTile(x: number, y: number): Tile {
        if (x < 0 || x >= this.board_width || y < 0 || y >= this.board_height)
            return;

        return this.tiles[y * this.board_width + x];
    }

    public getIntTiles(x: number, y: number, dir: Direction): Tile[] {
        if (dir == Direction.Top) {
            if (y % 2 == 0) {
                return [
                    this.getTile(x - 1, y - 1),
                    this.getTile(x, y - 1),
                    this.getTile(x, y),
                ];
            }
            else {
                return [
                    this.getTile(x, y - 1),
                    this.getTile(x + 1, y - 1),
                    this.getTile(x, y),
                ];
            }
        }
        else if (dir == Direction.Bottom) {
            if (y % 2 == 0) {
                return [
                    this.getTile(x, y),
                    this.getTile(x, y + 1),
                    this.getTile(x - 1, y + 1),
                ];
            }
            else {
                return [
                    this.getTile(x, y),
                    this.getTile(x + 1, y + 1),
                    this.getTile(x, y + 1),
                ];
            }
        }
        else if (dir == Direction.Left) {
            if (x % 2 == 0) {
                return [
                    this.getTile(x - 1, y - 1),
                    this.getTile(x, y),
                    this.getTile(x - 1, y),
                ];
            }
            else {
                return [
                    this.getTile(x - 1, y),
                    this.getTile(x, y),
                    this.getTile(x - 1, y + 1),
                ];
            }
        }
        else if (dir == Direction.Right) {
            if (x % 2 == 0) {
                return [
                    this.getTile(x, y),
                    this.getTile(x + 1, y - 1),
                    this.getTile(x + 1, y),
                ];
            }
            else {
                return [
                    this.getTile(x, y),
                    this.getTile(x + 1, y),
                    this.getTile(x + 1, y + 1),
                ];
            }
        }


        return [];
    }

    public drawText(text: string, x: number, y: number) {
        if (!text)
            return;

        this.ctx.font = '24px consolas';
        this.ctx.fillText(text, x - 12 * text.length / 2, y + 6);
    }

    public drawTextSmall(text: string, x: number, y: number) {
        if (!text)
            return;

        this.ctx.font = '16px consolas';
        this.ctx.fillText(text, x - 8 * text.length / 2, y + 4);
    }

    public drawGrid() {
        this.ctx.fillStyle = 'rgb(0, 0, 0)';
        this.ctx.strokeStyle = 'rgb(180, 180, 180)';

        var c = 0, r = 0;

        for (var i = 0; i < this.tiles.length; i++) {
            var tile = this.tiles[i];

            if (tile) {
                var x = this.board_left + this.hexagon_r * (1 + 3 / 2 * c);
                var y = this.board_top + this.hexagon_h * (1 + 2 * r);

                if (c % 2 == 1)
                    y += this.hexagon_h;

                //draw hex
                if (this.getTileDrawHex(tile)) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(x - this.hexagon_r, y);
                    this.ctx.lineTo(x - this.hexagon_r / 2, y - this.hexagon_h);
                    this.ctx.lineTo(x + this.hexagon_r / 2, y - this.hexagon_h);
                    this.ctx.lineTo(x + this.hexagon_r, y);
                    this.ctx.lineTo(x + this.hexagon_r / 2, y + this.hexagon_h);
                    this.ctx.lineTo(x - this.hexagon_r / 2, y + this.hexagon_h);
                    this.ctx.lineTo(x - this.hexagon_r, y);
                    this.ctx.stroke();
                }

                this.drawText(this.getTileLabel(tile), x, y);
                this.drawText(this.getTileDots(tile), x, y + 12);
                this.drawTextSmall(this.getIntLabel(tile, Direction.Left), x - this.hexagon_r, y);
                this.drawTextSmall(this.getIntLabel(tile, Direction.Right), x + this.hexagon_r, y);

                //this.ctx.beginPath();
                //this.ctx.arc(x, y, hy1, 0, 2 * Math.PI);
                //this.ctx.stroke();
            }

            c++;
            if (c >= this.board_width) {
                c = 0;
                r++;
            }
        }
    }

    public getTileDrawHex = function (tile: Tile): boolean {
        //return !!(tile);
        return !!(tile && tile.fillOrder);
    }

    public getTileLabel = function (tile: Tile): string {
        if (!tile)
            return;

        //return (tile.numberValue ? tile.numberValue + " " : "") + "(" + tile.x + ", " + tile.y + ")";
        //return tile.x + ", " + tile.y;

        //return tile.fillOrder >= 0 ? tile.fillOrder.toString() : undefined;
        return tile.numberValue >= 0 ? tile.numberValue.toString() : undefined;
    }

    public getTileDots = function (tile: Tile): string {
        if (!tile)
            return;

        return tile.dots > 0 ? Array(tile.dots + 1).join(".") : undefined;
    }

    public getIntLabel = function (tile: Tile, dir: Direction): string {
        if (!tile || !tile.ints)
            return;

        var int = tile.ints[dir];

        if (!int)
            return;

        //return int.label;
        return int.prodSum >= 0 ? int.prodSum.toString() : undefined;
    }

    onCanvasClick = (ev: MouseEvent) => {
        //console.clear();
        //console.log(ev);        
        //console.log("click");

        var rect = this.canvas.getBoundingClientRect();
        var x = (ev.clientX - rect.left - this.board_left);
        var y = (ev.clientY - rect.top - this.board_top);

        //console.log("tran", x, y);

        //where in the local grid are you
        var gx = 2 * x / this.hexagon_r % 6;
        var gy = y / this.hexagon_h % 2;
        x = 2 * Math.floor(x / (3 * this.hexagon_r));
        y = Math.floor(y / (this.hexagon_h * 2));

        //console.log("div", x, y);
        //console.log("local", gx, gy);

        if (gx > 4) {
            x = x + 1;
            if (gy < 1)
                y = y - 1;
        }
        else if (gx > 3) {
            var slope_right = (1 - gy) / (4 - gx);
            //console.log("slope_right", slope_right, (4 - gx));                        
            if (slope_right > 1) {                
                x = x + 1;
                y = y - 1;
            }
            else if (slope_right < -1) {
                x = x + 1;
            }
        }
        else if (gx < 1) {
            var slope_left = (1 - gy) / (gx);
            //console.log("slope_left", slope_left);
            if (slope_left > 1) {
                x = x - 1;
                y = y - 1;
            }
            else if (slope_left < -1) {
                x = x - 1;
            }
        }                

        var tile = this.getTile(x, y);
        //console.log("click", ev.clientX, ev.clientY, x, y, tile);

        if (tile && tile.fillOrder > 0 && tile.fillOrder != this.dessert) {
            this.redraw(tile.fillOrder);
        }
    }
}

window.onload = function () {
    var catan = new Catan("canvas");
    window["catan"] = catan;
    
    var totals = [];
    for (var i = 1; i < 20; i++) {
        //catan.redraw(i);
        //totals.push(catan.dot_totals.counts);
    }

    console.log(totals);
};

