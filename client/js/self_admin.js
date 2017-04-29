var passwordProgressAlert = $('div[name="changePasswordProgressAlert"]');
var usernameProgressAlert = $('div[name="changeUsernameProgressAlert"]');
var deactivateProgressAlert = $('div[name="deactivateAccountProgressAlert"]');

var parseError = function(response){
  var data = typeof response.error().responseJSON === 'undefined' ? null : response.error().responseJSON;
  return data.error.message ? data.error.message : "An unknown error occured.";
}

$("input").keypress(function (evt) {
  var charCode = evt.charCode || evt.keyCode;
  if (charCode  == 13) { //Enter key's keycode
    return false;
  }
});

$('button[name="changePasswordSubmitButton"]').on('click', function(){
  var oPassword = $('form#changePasswordForm input[name="currentPassword"]').val();
  var nPassword = $('form#changePasswordForm input[name="newPassword"]').val();
  var nCPassword = $('form#changePasswordForm input[name="newConfPassword"]').val();

  if(nPassword !== nCPassword){
    return passwordProgressAlert.attr('class', '').addClass('alert alert-danger').text('Passwords don\'t match!');
  }

  $.post('/api/user/change_password', {old: oPassword, new: nPassword})
    .done(function(data) {
      passwordProgressAlert.attr('class', '').addClass('alert alert-success').text('All done! Your password has been changed.');
    })
    .fail(function(response){
      passwordProgressAlert.attr('class', '').addClass('alert alert-danger').html('<b>Oh snap!</b> ' + parseError(response));
    });
});

$('#changePassword').on('hidden.bs.modal', function() {
  passwordProgressAlert.attr('class', '').addClass('hidden').text('');
});

$('button[name="changeUsernameSubmitButton"]').on('click', function(){
  var newName = $('form#changeUsernameForm input[name="newUsername"]').val();
  $.post('/api/user/change_username', {username: newName})
    .done(function(data) {
      usernameProgressAlert.attr('class', '').addClass('alert alert-success').text('All done! Your new name is ' + data.newName);
      $('span[name="user-dropdown"]').text(data.newName);
    })
    .fail(function(response) {
      usernameProgressAlert.attr('class', '').addClass('alert alert-danger').html('<b>Oh snap!</b> ' + parseError(response));
    });
});

$('#changeUsername').on('hidden.bs.modal', function() {
  usernameProgressAlert.attr('class', '').addClass('hidden').text('');
});

$('button[name="deactivateAccountSubmitButton"]').on('click', function(){
  var passwordVerification = $('form#deactivateAccountForm input[name="deactivatePasswordVerification"]').val();
  $.post('/api/user/deactivate', {password: passwordVerification})
  .done(function(data) {
    deactivateProgressAlert.attr('class', '')
    .addClass('alert alert-success')
    .text('Sorry to see you go! Your account has been successfully deactivated. Thank you for using Place!');
    $('span[name="user-dropdown"]').text('Deactivated');
  })
  .fail(function(response) {
    deactivateProgressAlert.attr('class', '')
    .addClass('alert alert-danger')
    .html('<b>Oh snap!</b> ' + parseError(response));
  });
});

$('#deactivateAccount').on('hidden.bs.modal', function() {
  deactivateProgressAlert.attr('class', '').addClass('hidden').text('');
})
