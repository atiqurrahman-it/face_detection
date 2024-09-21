
import "../../App.css";
const Nav=()=>{
    return (
        <nav className="flex  justify-center items-center gap-4 mt-3 navbar">
          <button>
            <a href="/">Home</a>
          </button>
          <button>
            <a href="/face-detection">FaceDetection</a>
          </button>
          <button>
            <a href="/input-image">InputImage</a>
          </button>
        </nav>
     
    );
}

export default Nav