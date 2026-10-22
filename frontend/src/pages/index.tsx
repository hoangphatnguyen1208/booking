import type { GetServerSideProps } from "next";
import ExplorePage from "../ExplorePage";
import type { HotelList } from "../api";
import { hotelQuery, publicData } from "../server/public-api";
type Props = { initialData: HotelList | null; query: Record<string, string> };
export default function Home(props: Props) {
  return <ExplorePage key={JSON.stringify(props.query)} {...props} />;
}
export const getServerSideProps: GetServerSideProps<Props> = async ({
  query: raw,
}) => {
  const query = hotelQuery(raw);
  const result = await publicData<HotelList>(
    "/hotels?" + new URLSearchParams({ limit: "20", page: "1", ...query }),
  );
  return { props: { initialData: result.data, query } };
};
