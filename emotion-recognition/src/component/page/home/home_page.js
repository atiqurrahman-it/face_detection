import "../../../App.css";
import Background from "../../backgorund/backgorun";
import Nav from "../../navbar/navbar";
const HomePage = () => {
  return (
    <div className=" h-full w-full relative z-10">
      <div className="flex justify-center items-center relative z-20 ">
        <Nav />
      </div>
      <div style={{height:"90vh"}} className="text-white flex  justify-center items-center relative z-20 text-3xl font-bold capitalize ">
        Welcome to the Emotion Detection 
      </div>
      <Background id="tsparticles" className="absolute inset-0 z-0" />
    </div>
  );
};

export default HomePage;
