import React from 'react';

interface FPSState {
    fps: number;
}

class FPS extends React.Component<undefined, FPSState> {
    private maxFramesCount = 10;
    private averageFrameTime = 0;
    private lastFrame = 0;
    private currentFrame = 0;
    private framesCount = 0;
    private timerID: number;
    private active = false;
    constructor() {
        super();
        this.state = {
            fps: 0
        };
        this.lastFrame = (new Date).getTime();
        this.active = true;
    }
    componentDidMount() {
        this.timerID = setInterval(() => {
            const fps = this.averageFrameTime > 0.001 ?
                1000 / this.averageFrameTime :
                0;
            this.setState({
                fps: 1000 / this.averageFrameTime
            })
        }, 100);
        this.animate();
    }
    componentWillUnmount() {
        clearInterval(this.timerID);
        this.active = false;
    }
    private animate = () => {
        if (!this.active) return;
        window.requestAnimationFrame(this.animate);
        this.currentFrame = (new Date).getTime();
        const currentFrameTime = this.currentFrame - this.lastFrame;
        if (this.framesCount < this.maxFramesCount) this.framesCount++;
        this.averageFrameTime += (
            currentFrameTime - this.averageFrameTime) / this.framesCount;
        this.lastFrame = this.currentFrame;
    }
    render() {
        return (
            <div>
                <span style={{
                    margin: "0 3px 0 0"
                }}>
                    Fps:
                </span>
                <span id="fps">
                    {this.state.fps.toFixed()}
                </span>
            </div>
        );
    }
}

export default FPS;