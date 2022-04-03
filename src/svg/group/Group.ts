import { ScaleLinear, scaleLinear } from "d3-scale";
import { Selection, select } from "d3";
//+++++++++++++++++++++++++++++++++++++++++++++++++++//

import { Scene } from "@scene/Scene";

import { Cubicon } from "@cubicons/Cubicon";

import { Animation, TYPES } from "@animations/Animation";
import { FadeOut } from "@animations/FadeOut";

/**
 * The dad/mom object of every pack of objects in the visualization.
 *
 * A group must belong to a scene.
 *
 * Group is classified in terms of its purpose.
 * Below `Group()` is a SVG group to render SVG objects.
 *
 * Please see the Quick Start page in official documentation for clearer understanding about this `Group` term.
 */
export class Group {
    /**
     * The scene that this group belongs to.
     */
    scene: Scene;

    /**
     * The `<svg/>` element that represents this group.
     */
    svg_group: Selection<SVGSVGElement, unknown, HTMLElement, any>;

    /**
     * Name of this group.
     */
    name: string;

    /**
     * Cubicons included in this group.
     */
    cubicons: Cubicon[];

    /**
     * Animations played in this group.
     */
    animations: Animation[];

    /**
     * Number of squares in the x direction.
     */
    xSquareNums: number;

    /**
     * Number of squares in the x direction.
     */
    ySquareNums: number;

    /**
     * Length of a square in this scene.
     */
    squareLength = 40;

    /**
     * Ratio between square length in x direction and y direction.
     */
    ratio: [number, number] = [1, 1];

    /**
     * x coordinate bound values of this scene.
     */
    xBound: [number, number];

    /**
     * y coordinate bound values of this scene.
     */
    yBound: [number, number];

    /**
     * Convert x value of grid coordinates to real-world coordinates.
     */
    xGtoW: ScaleLinear<number, number, never>;

    /**
     * Convert y value of grid coordinates to real-world coordinates.
     */
    yGtoW: ScaleLinear<number, number, never>;

    /**
     * Convert x value of real-world coordinates to grid coordinates.
     */
    xWtoG: ScaleLinear<number, number, never>;

    /**
     * Convert y value of real-world coordinates to grid coordinates.
     */
    yWtoG: ScaleLinear<number, number, never>;

    /**
     * The total time to finish playing all animations in the current queue (will be override when the next queue is called). (in milliseconds)
     */
    queueElapsed: number;

    /**
     * The time passed by since this group was created. (in milliseconds)
     *
     * > (aka the total time of all the animations **called** in this group)
     */
    groupElapsed: number;

    /**
     * The total time before this group is created. (in milliseconds)
     *
     * > (aka the total time of all the animations **called** in **other** groups in the same scene)
     */
    sleepTime: number;

    /**
     * Include this group to HTML flow.
     *
     * @param groupName Name of the group.
     *
     * @param scene The scene that the group belongs to.
     */
    constructor(groupName: string, scene: Scene) {
        this.scene = scene;

        this.svg_group = select("#cubecubed")
            .append("svg")
            .attr("id", groupName)
            .attr("class", "group")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("width", scene.sceneWidth)
            .attr("height", scene.sceneHeight)
            .attr(
                "viewBox",
                `${-scene.sceneWidth / 2} ${-scene.sceneHeight / 2} ${
                    scene.sceneWidth
                } ${scene.sceneHeight}`
            )
            .attr("transform", "scale(1, -1)");

        this.svg_group.style("position", "absolute");

        this.name = groupName;

        this.cubicons = [];

        this.animations = [];

        this.defineBoundsAndSquares(this.ratio);

        this.defineCovertFunctions(this.ratio);

        this.queueElapsed = 0;
        this.groupElapsed = 0;

        this.sleepTime = 0;

        this.scene.groups.push(this);
    }

    /**
     * Render all the specified cubicons on the screen (instead of calling `.render()` for each of the cubicon).
     *
     * @param cubicons Comma-separated cubicons to render.
     */
    render(...cubicons: any[]) {
        cubicons.forEach((cubicon) => {
            cubicon.render();
        });
    }

    private defineBoundsAndSquares(ratio: [number, number]) {
        const { sceneWidth, sceneHeight } = this.scene;

        const xSquareLength = ratio[0] * this.squareLength;
        const ySquareLength = ratio[1] * this.squareLength;

        this.xSquareNums = Math.floor(sceneWidth / xSquareLength);
        this.ySquareNums = Math.floor(sceneHeight / ySquareLength);

        this.xBound = [
            Math.floor(-this.xSquareNums / 2),
            -Math.floor(-this.xSquareNums / 2),
        ];
        this.yBound = [
            Math.floor(-this.ySquareNums / 2),
            -Math.floor(-this.ySquareNums / 2),
        ];
    }

    private defineCovertFunctions(ratio: [number, number]) {
        const { sceneWidth, sceneHeight } = this.scene;

        const xBound = [
            -sceneWidth / (this.squareLength * ratio[0]),
            sceneWidth / (this.squareLength * ratio[0]),
        ];

        const yBound = [
            -sceneHeight / (this.squareLength * ratio[1]),
            sceneHeight / (this.squareLength * ratio[1]),
        ];

        this.xGtoW = scaleLinear()
            .domain(xBound)
            .range([-sceneWidth, sceneWidth]);

        this.yGtoW = scaleLinear()
            .domain(yBound)
            .range([-sceneHeight, sceneHeight]);

        this.xWtoG = scaleLinear()
            .domain([-sceneWidth, sceneWidth])
            .range(this.xBound);

        this.yWtoG = scaleLinear()
            .domain([-sceneHeight, sceneHeight])
            .range(this.yBound);
    }

    /**
     * Play all the animations included in a queue.
     *
     * @param anims Array (Queue) of animations to play.
     */
    play(anims: any[]) {
        anims.forEach((anim) => {
            anim.cubicon.elapsedTime = this.queueElapsed;
            if (typeof anim.projectors !== "undefined") {
                anim.projectors.forEach(
                    (p: any) => (p.elapsedTime = this.queueElapsed)
                );
            }
        });

        anims.forEach((anim) => {
            this.addAnimation(anim);

            try {
                anim.play(this.sleepTime);
            } catch (err) {
                // throw new Error(
                //     anim.cubicon.constructor.name +
                //         "() haven't been rendered on the screen. Please call render() on the cubicon you're invoking with the `new` keyword."
                // );
            }

            this.sleepTime = 0;
        });

        this.queueElapsed = Math.max(
            ...anims.map((anim) => anim.cubicon.elapsedTime)
        );

        anims.forEach((a) => {
            a.cubicon.elapsedTime = this.queueElapsed;
        });

        this.groupElapsed = this.queueElapsed;
    }

    /**
     * Sleep this group for an amount of time.
     *
     * @param milliseconds The time to sleep.
     */
    sleep(milliseconds: number) {
        this.sleepTime = milliseconds;
    }

    private addAnimation(anim: Animation) {
        this.animations.push(anim);
    }

    /**
     * @deprecated
     *
     * Add a cubicon to this group.
     */
    add(cubicon: Cubicon) {
        this.cubicons.push(cubicon);
    }

    /**
     * Remove a cubicon from this group.
     *
     * @param cubicon The cubicon to remove.
     */
    remove(cubicon: TYPES) {
        if (cubicon.cubType === "geometry") {
            cubicon.group.play([new FadeOut({ cubicon: cubicon })]);
        }
        cubicon.def_cubiconBase
            .transition()
            .delay(cubicon.elapsedTime + this.groupElapsed)
            .duration(0)
            .remove();
    }

    /**
     * Fade out and destroy this group from the HTML flow.
     * That means, everything in the scene will be removed, too.
     *
     * @param delay Delay (in milliseconds) before destroying this scene.
     */
    destroy(delay: number) {
        this.svg_group
            .transition()
            .delay(this.groupElapsed + delay)
            .duration(500)
            .style("opacity", 0)
            .remove();
    }
}
