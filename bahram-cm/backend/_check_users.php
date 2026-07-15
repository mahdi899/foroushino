$users = \App\Models\User::query()->latest('id')->limit(10)->get(['id','mobile','name','created_at']);
foreach ($users as $u) {
  $resp = \App\Models\FamilyActionResponse::where('user_id', $u->id)->count();
  echo \"user {$u->id} mobile={$u->mobile} responses={$resp}
\";
}
