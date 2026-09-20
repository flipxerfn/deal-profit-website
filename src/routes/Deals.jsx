import { Link } from 'react-router-dom';
import { FaFire, FaUtensils, FaHeadphones } from 'react-icons/fa';
import deal1Cropped from '../assets/crops/deal1-cropped.jpg';
import deal2Cropped from '../assets/crops/deal2-cropped.png';

const Deals = () => {
  return (
    <>
      <section className="pb-16">
        <header className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">
            Latest Deals
          </h1>
          <p className="mt-2 text-lg text-gray-300">
            Real finds from the Deal Profit community.
          </p>
        </header>

        {/* Toolbar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 items-center space-x-4">
            <input
              type="text"
              placeholder="Search deals..."
              className="flex-1 min-w-[200px] px-4 py-2 bg-black/60 border border-pink-500/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <select
              className="px-4 py-2 bg-black/60 border border-pink-500/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">All Categories</option>
              <option value="tech">Tech</option>
              <option value="penny">Penny Deals</option>
              <option value="other">Other</option>
            </select>
            <select
              className="ml-4 px-4 py-2 bg-black/60 border border-pink-500/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="newest">Sort: Newest</option>
              <option value="price-low">Sort: Price Low to High</option>
              <option value="price-high">Sort: Price High to Low</option>
              <option value="discount">Sort: Discount %</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-1 text-xs bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 rounded"
            >
              All
            </button>
            <button
              className="px-3 py-1 text-xs bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 rounded"
            >
              Tech
            </button>
            <button
              className="px-3 py-1 text-xs bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 rounded"
            >
              Penny Deals
            </button>
            <button
              className="px-3 py-1 text-xs bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 rounded"
            >
              Other
            </button>
          </div>
        </div>

        {/* Deal Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* RTX 5060 Gaming PC Deal */}
          <div className="relative group">
            <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
              <div className="relative">
                <div className="aspect-w-4 aspect-h-3 w-full rounded-xl overflow-hidden mb-4">
                  <img
                    src={deal1Cropped}
                    alt="RTX 5060 Gaming PC - $39.99"
                    className="w-full h-full object-cover object-[center_top]"
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-pink-500/20 text-pink-400 text-xs px-2 py-0.5 rounded">Tech</span>
                    <h3 className="font-semibold text-white text-lg">RTX 5060 Gaming PC</h3>
                  </div>
                  <p className="mb-2 text-sm text-gray-300">
                    Brand new RTX 5060 gaming PC with RGB lighting
                  </p>
                  <div className="flex items-baseline space-x-3">
                    <p className="text-3xl font-bold text-pink-400">
                      $39.99
                    </p>
                    <p className="text-xs text-gray-400 line-through">
                      $599.99
                    </p>
                    <span className="text-xs text-pink-400 bg-pink-500/20 rounded px-2 py-0.5">
                      93% OFF
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Retail: $599.99 • Save 93%
                  </p>
                  <Link
                    to="https://whop.com/deal-profit/deal-profit-01/"
                    className="mt-4 inline-block px-4 py-2 text-sm font-medium bg-pink-500/20 text-pink-400 rounded hover:bg-pink-500/30 transition-all"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Deal
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Wireless Headphones Deal */}
          <div className="relative group">
            <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
              <div className="relative">
                <div className="aspect-w-4 aspect-h-3 w-full rounded-xl overflow-hidden mb-4">
                  <img
                    src={deal2Cropped}
                    alt="Wireless Headphones - $12.99"
                    className="w-full h-full object-cover object-[center]"
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-pink-500/20 text-pink-400 text-xs px-2 py-0.5 rounded">Audio</span>
                    <h3 className="font-semibold text-white text-lg">Wireless Headphones</h3>
                  </div>
                  <p className="mb-2 text-sm text-gray-300">
                    Premium noise-cancelling Bluetooth headphones
                  </p>
                  <div className="flex items-baseline space-x-3">
                    <p className="text-3xl font-bold text-pink-400">
                      $12.99
                    </p>
                    <p className="text-xs text-gray-400 line-through">
                      $129.99
                    </p>
                    <span className="text-xs text-pink-400 bg-pink-500/20 rounded px-2 py-0.5">
                      90% OFF
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Retail: $129.99 • Save 90%
                  </p>
                  <Link
                    to="https://whop.com/deal-profit/deal-profit-01/"
                    className="mt-4 inline-block px-4 py-2 text-sm font-medium bg-pink-500/20 text-pink-400 rounded hover:bg-pink-500/30 transition-all"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Deal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Deals;