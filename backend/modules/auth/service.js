export async function createLoginPreview(payload) {
  const email = payload?.email?.trim() || "director@talme.ai";
  const role = payload?.role?.trim() || "Enterprise Admin";

  return {
    user: {
      name: email.split("@")[0].replace(/[._-]/g, " "),
      email,
      role
    }
  };
}
