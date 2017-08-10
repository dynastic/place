var passwordProgressAlert = $("div[name=\"changePasswordProgressAlert\"]");
var deactivateProgressAlert = $("div[name=\"deactivateAccountProgressAlert\"]");

var parseError = function(response) {
  var data = typeof response.error === "object" ? response : (typeof response.error().responseJSON === "undefined" ? null : response.error().responseJSON);
  return data.error.message ? data.error.message : "An unknown error occured.";
}

function setAlert(alert, success = true, text) {
  alert.attr("class", "").addClass(`alert alert-${success ? "success" : "danger"}`).html(`<strong>${success ? "Success!" : "Uh oh!"}</strong> ${text}`);
}

$("form#changePasswordForm").submit(function(e) {
  e.preventDefault();
  var oPassword = $(this).find("input[name=\"password\"]").val();
  var nPassword = $(this).find("input[name=\"newPassword\"]").val();
  var nCPassword = $(this).find("input[name=\"newConfPassword\"]").val();
  if(oPassword == "" || nPassword == "" || nCPassword == "") return setAlert(passwordProgressAlert, false, "Please fill out all the fields.");
  if(nPassword !== nCPassword) return setAlert(passwordProgressAlert, false, "The passwords you entered did not match.");

  $.post("/api/user/change-password", {old: oPassword, new: nPassword}).done(function(response) {
    if(!response.success) return setAlert(passwordProgressAlert, false, parseError(response));
    window.location = "/account?hasNewPassword=true";
  }).fail(function(response){
    setAlert(passwordProgressAlert, false, parseError(response));
  });
});

$("form#deactivateAccountForm").submit(function(e) {
  e.preventDefault();
  var password = $(this).find("input[name=\"password\"]").val();
  if(password == "") return setAlert(passwordProgressAlert, false, "Please enter your password.");

  $.post("/api/user/deactivate", {password: password}).done(function(response) {
    if(!response.success) return setAlert(passwordProgressAlert, false, parseError(response));
    window.location = "/deactivated";
  }).fail(function(response) {
    setAlert(deactivateProgressAlert, false, parseError(response));
  });
});

$("#changePassword, #deactivateAccount").on("hidden.bs.modal", function() {
  $(this).find(".alert").attr("class", "").addClass("hidden").text("");
});