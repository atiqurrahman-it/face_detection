import { NavLink } from "react-router-dom";
import "../../App.css";
import "./navbar.css";

const Nav = () => {
  return (
    <nav className="flex justify-center items-center pt-8 navbar">
      <div class="flex justify-center ">
        <div class="p-2 bg-white rounded-xl flex gap-x-1 overflow-hidden">
          <NavLink
            to="/"
            className={({ isActive, isPending }) =>
              `px-8 py-2   font-semibold rounded-lg e shadow-none focus:outline-none ${
                isPending
                  ? "pending"
                  : isActive
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-white hover:bg-gray-200"
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/face-detection"
            className={({ isActive, isPending }) =>
              `px-8 py-2 font-semibold rounded-lg e shadow-none focus:outline-none ${
                isPending
                  ? "pending"
                  : isActive
                  ? "bg-emerald-600 text-white font-bold	"
                  : "bg-white hover:bg-gray-200"
              }`
            }
          >
            FaceDetection
          </NavLink>
          <NavLink
            to="/input-image"
            className={({ isActive, isPending }) =>
              `px-8 py-2  font-semibold rounded-lg e shadow-none focus:outline-none ${
                isPending
                  ? "pending"
                  : isActive
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-white hover:bg-gray-200"
              }`
            }
          >
            InputImage
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
