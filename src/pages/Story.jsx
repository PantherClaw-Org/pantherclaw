import { Helmet } from "react-helmet-async";

export default function Story() {
  return (
    <div className="pt-28 px-4 sm:px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen">
      <Helmet>
        <title>Our Story | Pantherclaw</title>
        <meta
          name="description"
          content="Pantherclaw was born to create premium baggy and wide-leg denim. Engineered in India for those who move different."
        />
        <link rel="canonical" href="https://pantherclaw.in/story" />
      </Helmet>
      <h1 className="font-serif text-5xl mb-6">Our Story</h1>
      <p className="text-lg text-ash max-w-2xl">
        Pantherclaw was born out of a desire to create premium baggy &amp;
        wide-leg denim. Engineered in India for those who move different.
      </p>
    </div>
  );
}
