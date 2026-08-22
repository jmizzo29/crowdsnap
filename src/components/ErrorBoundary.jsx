import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn(error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="page">
          <div className="quiet">
            <p className="lede">This phone hit a snag. Photos already on this phone are still here.</p>
            <button className="btn" type="button" onClick={() => this.setState({ failed: false })}>
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
