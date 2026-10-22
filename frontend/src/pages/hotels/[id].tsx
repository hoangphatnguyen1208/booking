import type { GetServerSideProps } from "next";
import HotelPage from "../../HotelPage";
import type { Hotel } from "../../api";
import { publicData } from "../../server/public-api";
type Props = { id: string; initialHotel: Hotel | null };
export default function HotelDetail(props: Props) {
  return <HotelPage key={props.id} {...props} />;
}
export const getServerSideProps: GetServerSideProps<Props> = async ({
  params,
}) => {
  const id = String(params?.id || "");
  if (!/^[a-f0-9-]{36}$/i.test(id)) return { notFound: true };
  const result = await publicData<Hotel>("/hotels/" + id);
  if (result.status === 404) return { notFound: true };
  return { props: { id, initialHotel: result.data } };
};
