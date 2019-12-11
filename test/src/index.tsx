import React from "react";
import { Input, Init } from "@vdian/vc";
export default class Welcome extends React.Component {
  constructor(props) {
    super(props);
    this.carouselRef = React.createRef();
  }
  state: any = {
    model: {},
    env: {},
  }
  @Init
  init({model, env}) {
    this.state.model = model;
    this.state.env = env;
  }
  @Input("next")
  nextSlide() {
    let childComponent = this.carouselRef.current;
    childComponent.setIndex(childComponent.state.currentIndex + 1);
  }
  render() {
    const { images } = this.state.model;
    return (
      <div>
        <Carousel width={375} height={375} ref={this.carouselRef}>
          {images.map(image => (
            <img src={image} alt="" key={image} />
          ))}
        </Carousel>
      </div>
    );
  }
}